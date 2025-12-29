"""
Report generation tasks for background processing.
"""

from celery import shared_task
from datetime import datetime, timedelta
import json


@shared_task(bind=True)
def generate_student_progress_report_task(self, student_id: int, course_id: int = None):
    """
    Generate comprehensive progress report for a student.
    
    Args:
        student_id: Student user ID
        course_id: Optional course ID to filter by
    """
    from app import create_app
    from app.extensions import db
    from app.models.user import User
    from app.models.course import Course, Enrollment
    from app.models.content import VideoProgress
    from app.models.exam import ExamResult
    from app.models.evaluation import StudentProgress, Evaluation
    
    app = create_app()
    with app.app_context():
        student = User.query.get(student_id)
        
        if not student:
            return {'success': False, 'error': 'Student not found'}
        
        # Get enrollments
        enrollments_query = Enrollment.query.filter_by(user_id=student_id)
        if course_id:
            enrollments_query = enrollments_query.filter_by(course_id=course_id)
        
        enrollments = enrollments_query.all()
        
        report_data = {
            'student': {
                'id': student.id,
                'name': student.full_name,
                'email': student.email
            },
            'generated_at': datetime.utcnow().isoformat(),
            'courses': []
        }
        
        for enrollment in enrollments:
            course = enrollment.course
            
            # Video progress
            video_progress = VideoProgress.query.join(
                Video, VideoProgress.video_id == Video.id
            ).filter(
                VideoProgress.user_id == student_id,
                Video.course_id == course.id
            ).all()
            
            # Exam results
            exam_results = ExamResult.query.join(
                Exam, ExamResult.exam_id == Exam.id
            ).filter(
                ExamResult.user_id == student_id,
                Exam.course_id == course.id,
                ExamResult.status == 'completed'
            ).all()
            
            # Student progress record
            progress = StudentProgress.query.filter_by(
                student_id=student_id,
                course_id=course.id
            ).first()
            
            # Evaluations
            evaluations = Evaluation.query.filter_by(
                student_id=student_id,
                course_id=course.id
            ).order_by(Evaluation.created_at.desc()).all()
            
            course_data = {
                'course_id': course.id,
                'course_title': course.title,
                'enrollment_date': enrollment.created_at.isoformat(),
                'status': enrollment.status,
                'videos': {
                    'total': course.videos.count(),
                    'watched': len([v for v in video_progress if v.is_completed]),
                    'average_completion': sum(v.watch_percentage for v in video_progress) / len(video_progress) if video_progress else 0
                },
                'exams': {
                    'total_taken': len(exam_results),
                    'passed': len([e for e in exam_results if e.passed]),
                    'average_score': sum(e.score_percentage for e in exam_results) / len(exam_results) if exam_results else 0
                },
                'progress': {
                    'overall_progress': progress.overall_progress if progress else 0,
                    'video_progress': progress.video_completion_rate if progress else 0,
                    'exam_progress': progress.exam_completion_rate if progress else 0
                },
                'evaluations': [
                    {
                        'date': e.created_at.isoformat(),
                        'type': e.evaluation_type,
                        'score': e.score,
                        'teacher': e.teacher.full_name
                    }
                    for e in evaluations[:5]  # Last 5 evaluations
                ]
            }
            
            report_data['courses'].append(course_data)
        
        return {
            'success': True,
            'report': report_data
        }


@shared_task
def generate_course_analytics_report_task(course_id: int):
    """Generate analytics report for a course."""
    from app import create_app
    from app.extensions import db
    from app.models.course import Course, Enrollment
    from app.models.content import Video, VideoProgress
    from app.models.exam import Exam, ExamResult
    from sqlalchemy import func
    
    app = create_app()
    with app.app_context():
        course = Course.query.get(course_id)
        
        if not course:
            return {'success': False, 'error': 'Course not found'}
        
        # Enrollment stats
        total_enrollments = Enrollment.query.filter_by(course_id=course_id).count()
        active_enrollments = Enrollment.query.filter_by(
            course_id=course_id,
            status='active'
        ).count()
        completed_enrollments = Enrollment.query.filter_by(
            course_id=course_id,
            status='completed'
        ).count()
        
        # Video stats
        videos = Video.query.filter_by(course_id=course_id).all()
        video_stats = []
        
        for video in videos:
            progress_stats = db.session.query(
                func.count(VideoProgress.id),
                func.avg(VideoProgress.watch_percentage),
                func.count(VideoProgress.id).filter(VideoProgress.is_completed == True)
            ).filter(VideoProgress.video_id == video.id).first()
            
            video_stats.append({
                'video_id': video.id,
                'title': video.title,
                'views': progress_stats[0] or 0,
                'avg_completion': round(progress_stats[1] or 0, 2),
                'completed': progress_stats[2] or 0
            })
        
        # Exam stats
        exams = Exam.query.filter_by(course_id=course_id).all()
        exam_stats = []
        
        for exam in exams:
            result_stats = db.session.query(
                func.count(ExamResult.id),
                func.avg(ExamResult.score_percentage),
                func.count(ExamResult.id).filter(ExamResult.passed == True)
            ).filter(
                ExamResult.exam_id == exam.id,
                ExamResult.status == 'completed'
            ).first()
            
            exam_stats.append({
                'exam_id': exam.id,
                'title': exam.title,
                'attempts': result_stats[0] or 0,
                'avg_score': round(result_stats[1] or 0, 2),
                'passed': result_stats[2] or 0
            })
        
        report = {
            'course': {
                'id': course.id,
                'title': course.title,
                'teacher': course.teacher.full_name
            },
            'generated_at': datetime.utcnow().isoformat(),
            'enrollments': {
                'total': total_enrollments,
                'active': active_enrollments,
                'completed': completed_enrollments,
                'completion_rate': round((completed_enrollments / total_enrollments * 100) if total_enrollments else 0, 2)
            },
            'videos': {
                'total': len(videos),
                'stats': video_stats
            },
            'exams': {
                'total': len(exams),
                'stats': exam_stats
            }
        }
        
        return {'success': True, 'report': report}


@shared_task
def generate_weekly_summary_task():
    """Generate weekly summary for all courses."""
    from app import create_app
    from app.models.course import Course
    
    app = create_app()
    with app.app_context():
        courses = Course.query.filter_by(is_published=True, is_active=True).all()
        
        results = []
        for course in courses:
            task = generate_course_analytics_report_task.delay(course.id)
            results.append({'course_id': course.id, 'task_id': task.id})
        
        return {'total_courses': len(courses), 'tasks_queued': results}


@shared_task
def export_report_to_file_task(report_type: str, report_data: dict, format: str = 'json'):
    """Export report data to file."""
    import os
    from flask import current_app
    
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    filename = f'{report_type}_{timestamp}.{format}'
    
    # Get export directory
    export_dir = current_app.config.get('EXPORT_DIR', '/tmp/exports')
    os.makedirs(export_dir, exist_ok=True)
    
    filepath = os.path.join(export_dir, filename)
    
    if format == 'json':
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
    
    return {
        'success': True,
        'filename': filename,
        'filepath': filepath
    }
