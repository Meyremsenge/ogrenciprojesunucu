"""
Exams API endpoints.
"""

from flask import request, g
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_current_user
from datetime import datetime

from app.extensions import db
from app.models.course import Topic, Enrollment
from app.models.question import Question
from app.models.exam import Exam, ExamQuestion, ExamResult, ExamAnswer, ExamResultStatus
from app.api.decorators import teacher_required

exams_ns = Namespace('exams', description='Exam management operations')

# Request/Response Models
exam_model = exams_ns.model('Exam', {
    'id': fields.Integer(description='Exam ID'),
    'topic_id': fields.Integer(description='Topic ID'),
    'title': fields.String(description='Exam title'),
    'description': fields.String(description='Exam description'),
    'duration_minutes': fields.Integer(description='Duration in minutes'),
    'passing_score': fields.Integer(description='Passing score percentage'),
    'total_points': fields.Integer(description='Total points'),
    'max_attempts': fields.Integer(description='Maximum attempts'),
    'questions_count': fields.Integer(description='Number of questions'),
    'is_published': fields.Boolean(description='Is published'),
    'is_available': fields.Boolean(description='Is currently available'),
})

exam_create_model = exams_ns.model('ExamCreate', {
    'title': fields.String(required=True, description='Exam title'),
    'description': fields.String(description='Exam description'),
    'instructions': fields.String(description='Exam instructions'),
    'duration_minutes': fields.Integer(required=True, description='Duration in minutes'),
    'passing_score': fields.Integer(description='Passing score percentage', default=60),
    'max_attempts': fields.Integer(description='Maximum attempts (0 = unlimited)', default=1),
    'shuffle_questions': fields.Boolean(description='Shuffle questions', default=False),
    'shuffle_answers': fields.Boolean(description='Shuffle answers', default=False),
    'show_answers_after': fields.Boolean(description='Show answers after submission', default=True),
    'available_from': fields.DateTime(description='Available from date'),
    'available_until': fields.DateTime(description='Available until date'),
    'question_ids': fields.List(fields.Integer, description='Question IDs to include'),
})

exam_answer_model = exams_ns.model('ExamAnswerSubmit', {
    'question_id': fields.Integer(required=True, description='Question ID'),
    'answer_ids': fields.List(fields.Integer, description='Selected answer IDs'),
    'text_answer': fields.String(description='Text answer for essay questions'),
})

exam_submit_model = exams_ns.model('ExamSubmit', {
    'answers': fields.List(fields.Nested(exam_answer_model), description='All answers'),
})


@exams_ns.route('/topic/<int:topic_id>')
class TopicExams(Resource):
    """Exams by topic."""
    
    @jwt_required()
    @exams_ns.doc('list_topic_exams', security='Bearer')
    def get(self, topic_id):
        """Get exams in a topic."""
        current_user = get_current_user()
        topic = Topic.query.get(topic_id)
        
        if not topic:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Topic not found'
                }
            }, 404
        
        exams = topic.exams.filter_by(is_published=True).all()
        
        return {
            'success': True,
            'data': [exam.to_dict(user_id=current_user.id) for exam in exams]
        }, 200
    
    @jwt_required()
    @teacher_required
    @exams_ns.expect(exam_create_model)
    @exams_ns.doc('create_exam', security='Bearer')
    def post(self, topic_id):
        """Create a new exam in topic."""
        current_user = g.current_user
        topic = Topic.query.get(topic_id)
        
        if not topic:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Topic not found'
                }
            }, 404
        
        # Check permission
        if topic.course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only create exams in your own courses'
                }
            }, 403
        
        data = request.get_json()
        
        title = data.get('title', '').strip()
        duration = data.get('duration_minutes')
        
        if not title:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Exam title is required'
                }
            }, 400
        
        if not duration or duration < 1:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Valid duration is required'
                }
            }, 400
        
        # Create exam
        exam = Exam(
            topic_id=topic_id,
            title=title,
            description=data.get('description'),
            instructions=data.get('instructions'),
            duration_minutes=duration,
            passing_score=data.get('passing_score', 60),
            max_attempts=data.get('max_attempts', 1),
            shuffle_questions=data.get('shuffle_questions', False),
            shuffle_answers=data.get('shuffle_answers', False),
            show_answers_after=data.get('show_answers_after', True),
            available_from=data.get('available_from'),
            available_until=data.get('available_until')
        )
        
        db.session.add(exam)
        db.session.flush()
        
        # Add questions if provided
        question_ids = data.get('question_ids', [])
        for idx, question_id in enumerate(question_ids):
            question = Question.query.get(question_id)
            if question and question.topic_id == topic_id:
                exam_question = ExamQuestion(
                    exam_id=exam.id,
                    question_id=question_id,
                    order_index=idx,
                    points=question.points
                )
                db.session.add(exam_question)
        
        # Calculate total points
        exam.calculate_total_points()
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Exam created successfully',
            'data': exam.to_dict(include_questions=True)
        }, 201


@exams_ns.route('/<int:exam_id>')
class ExamDetail(Resource):
    """Single exam operations."""
    
    @jwt_required()
    @exams_ns.doc('get_exam', security='Bearer')
    def get(self, exam_id):
        """Get exam details."""
        current_user = get_current_user()
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Exam not found'
                }
            }, 404
        
        # Include questions for teachers
        include_questions = (
            current_user.is_admin or 
            exam.topic.course.teacher_id == current_user.id
        )
        
        return {
            'success': True,
            'data': exam.to_dict(include_questions=include_questions, user_id=current_user.id)
        }, 200
    
    @jwt_required()
    @teacher_required
    @exams_ns.expect(exam_create_model)
    @exams_ns.doc('update_exam', security='Bearer')
    def put(self, exam_id):
        """Update exam."""
        current_user = g.current_user
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Exam not found'
                }
            }, 404
        
        if exam.topic.course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only update exams in your own courses'
                }
            }, 403
        
        data = request.get_json()
        
        if 'title' in data:
            exam.title = data['title'].strip()
        if 'description' in data:
            exam.description = data['description']
        if 'instructions' in data:
            exam.instructions = data['instructions']
        if 'duration_minutes' in data:
            exam.duration_minutes = data['duration_minutes']
        if 'passing_score' in data:
            exam.passing_score = data['passing_score']
        if 'max_attempts' in data:
            exam.max_attempts = data['max_attempts']
        if 'shuffle_questions' in data:
            exam.shuffle_questions = data['shuffle_questions']
        if 'shuffle_answers' in data:
            exam.shuffle_answers = data['shuffle_answers']
        if 'show_answers_after' in data:
            exam.show_answers_after = data['show_answers_after']
        if 'is_published' in data:
            exam.is_published = data['is_published']
        
        # Update questions if provided
        if 'question_ids' in data:
            ExamQuestion.query.filter_by(exam_id=exam.id).delete()
            
            for idx, question_id in enumerate(data['question_ids']):
                question = Question.query.get(question_id)
                if question:
                    exam_question = ExamQuestion(
                        exam_id=exam.id,
                        question_id=question_id,
                        order_index=idx,
                        points=question.points
                    )
                    db.session.add(exam_question)
            
            exam.calculate_total_points()
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Exam updated successfully',
            'data': exam.to_dict(include_questions=True)
        }, 200
    
    @jwt_required()
    @teacher_required
    @exams_ns.doc('delete_exam', security='Bearer')
    def delete(self, exam_id):
        """Delete exam."""
        current_user = g.current_user
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Exam not found'
                }
            }, 404
        
        if exam.topic.course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only delete exams from your own courses'
                }
            }, 403
        
        db.session.delete(exam)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Exam deleted successfully'
        }, 200


@exams_ns.route('/<int:exam_id>/start')
class ExamStart(Resource):
    """Start an exam attempt."""
    
    @jwt_required()
    @exams_ns.doc('start_exam', security='Bearer')
    def post(self, exam_id):
        """Start an exam attempt."""
        current_user = get_current_user()
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Exam not found'
                }
            }, 404
        
        # Check if user can attempt
        can_attempt, reason = exam.can_user_attempt(current_user.id)
        if not can_attempt:
            return {
                'success': False,
                'error': {
                    'code': 'EXAM_NOT_AVAILABLE',
                    'message': reason
                }
            }, 400
        
        # Check enrollment
        enrollment = Enrollment.query.filter_by(
            user_id=current_user.id,
            course_id=exam.topic.course_id
        ).first()
        
        if not enrollment and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_ENROLLED',
                    'message': 'You must be enrolled in the course to take this exam'
                }
            }, 403
        
        # Create exam result
        result = ExamResult(
            exam_id=exam_id,
            user_id=current_user.id,
            max_score=exam.total_points,
            ip_address=request.remote_addr
        )
        result.start()
        
        db.session.add(result)
        db.session.commit()
        
        # Get questions (shuffled if configured)
        questions = list(exam.exam_questions)
        if exam.shuffle_questions:
            import random
            random.shuffle(questions)
        
        # Build question data
        questions_data = []
        for eq in questions:
            q_data = eq.question.to_dict(include_answers=True, include_correct=False)
            q_data['points'] = eq.effective_points
            q_data['order_index'] = eq.order_index
            
            # Shuffle answers if configured
            if exam.shuffle_answers and 'answers' in q_data:
                import random
                random.shuffle(q_data['answers'])
            
            questions_data.append(q_data)
        
        return {
            'success': True,
            'message': 'Exam started',
            'data': {
                'result_id': result.id,
                'exam': {
                    'id': exam.id,
                    'title': exam.title,
                    'instructions': exam.instructions,
                    'duration_minutes': exam.duration_minutes,
                    'total_points': exam.total_points
                },
                'questions': questions_data,
                'started_at': result.started_at.isoformat(),
                'expires_at': result.expires_at.isoformat(),
                'time_remaining_seconds': result.time_remaining_seconds
            }
        }, 200


@exams_ns.route('/<int:exam_id>/submit')
class ExamSubmit(Resource):
    """Submit an exam."""
    
    @jwt_required()
    @exams_ns.expect(exam_submit_model)
    @exams_ns.doc('submit_exam', security='Bearer')
    def post(self, exam_id):
        """Submit exam answers."""
        current_user = get_current_user()
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Exam not found'
                }
            }, 404
        
        # Get in-progress result
        result = ExamResult.query.filter_by(
            exam_id=exam_id,
            user_id=current_user.id,
            status=ExamResultStatus.IN_PROGRESS.value
        ).first()
        
        if not result:
            return {
                'success': False,
                'error': {
                    'code': 'NO_ACTIVE_ATTEMPT',
                    'message': 'No active exam attempt found'
                }
            }, 400
        
        # Check if expired
        if result.is_expired:
            result.expire()
            db.session.commit()
            
            return {
                'success': False,
                'error': {
                    'code': 'EXAM_EXPIRED',
                    'message': 'Exam time has expired'
                },
                'data': result.to_dict()
            }, 400
        
        data = request.get_json()
        answers_data = data.get('answers', [])
        
        # Process answers
        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            answer_ids = answer_data.get('answer_ids', [])
            text_answer = answer_data.get('text_answer')
            
            # Check if question is part of exam
            exam_question = ExamQuestion.query.filter_by(
                exam_id=exam_id,
                question_id=question_id
            ).first()
            
            if not exam_question:
                continue
            
            # Create or update answer
            exam_answer = ExamAnswer.query.filter_by(
                exam_result_id=result.id,
                question_id=question_id
            ).first()
            
            if not exam_answer:
                exam_answer = ExamAnswer(
                    exam_result_id=result.id,
                    question_id=question_id
                )
                db.session.add(exam_answer)
            
            exam_answer.selected_answer_ids = answer_ids
            exam_answer.text_answer = text_answer
            exam_answer.answered_at = datetime.utcnow()
            
            # Check and grade answer
            exam_answer.check_and_grade()
        
        # Submit exam
        result.submit()
        
        # Update exam statistics
        exam.update_statistics()
        
        db.session.commit()
        
        # Build response
        response_data = result.to_dict()
        
        if exam.show_answers_after:
            response_data['answers'] = [
                {
                    'question_id': a.question_id,
                    'selected_answer_ids': a.selected_answer_ids,
                    'is_correct': a.is_correct,
                    'points_earned': a.points_earned,
                    'correct_answers': [
                        ans.to_dict(include_correct=True)
                        for ans in a.question.answers if ans.is_correct
                    ],
                    'explanation': a.question.explanation
                }
                for a in result.answers
            ]
        
        return {
            'success': True,
            'message': 'Exam submitted successfully',
            'data': response_data
        }, 200


@exams_ns.route('/<int:exam_id>/save-answer')
class ExamSaveAnswer(Resource):
    """Save individual answer during exam."""
    
    @jwt_required()
    @exams_ns.expect(exam_answer_model)
    @exams_ns.doc('save_exam_answer', security='Bearer')
    def post(self, exam_id):
        """Save an answer during exam (auto-save)."""
        current_user = get_current_user()
        
        result = ExamResult.query.filter_by(
            exam_id=exam_id,
            user_id=current_user.id,
            status=ExamResultStatus.IN_PROGRESS.value
        ).first()
        
        if not result:
            return {
                'success': False,
                'error': {
                    'code': 'NO_ACTIVE_ATTEMPT',
                    'message': 'No active exam attempt found'
                }
            }, 400
        
        if result.is_expired:
            return {
                'success': False,
                'error': {
                    'code': 'EXAM_EXPIRED',
                    'message': 'Exam time has expired'
                }
            }, 400
        
        data = request.get_json()
        question_id = data.get('question_id')
        answer_ids = data.get('answer_ids', [])
        
        # Create or update answer
        exam_answer = ExamAnswer.query.filter_by(
            exam_result_id=result.id,
            question_id=question_id
        ).first()
        
        if not exam_answer:
            exam_answer = ExamAnswer(
                exam_result_id=result.id,
                question_id=question_id
            )
            db.session.add(exam_answer)
        
        exam_answer.selected_answer_ids = answer_ids
        exam_answer.answered_at = datetime.utcnow()
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Answer saved',
            'data': {
                'question_id': question_id,
                'saved_at': exam_answer.answered_at.isoformat()
            }
        }, 200


@exams_ns.route('/<int:exam_id>/results')
class ExamResults(Resource):
    """Exam results."""
    
    @jwt_required()
    @exams_ns.doc('get_exam_results', security='Bearer')
    def get(self, exam_id):
        """Get exam results for current user."""
        current_user = get_current_user()
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Exam not found'
                }
            }, 404
        
        # Teachers see all results
        if current_user.is_admin or exam.topic.course.teacher_id == current_user.id:
            results = exam.results.filter(
                ExamResult.status.in_([
                    ExamResultStatus.SUBMITTED.value,
                    ExamResultStatus.GRADED.value
                ])
            ).order_by(ExamResult.completed_at.desc()).all()
        else:
            # Students see only their own results
            results = exam.results.filter_by(
                user_id=current_user.id
            ).filter(
                ExamResult.status.in_([
                    ExamResultStatus.SUBMITTED.value,
                    ExamResultStatus.GRADED.value
                ])
            ).order_by(ExamResult.completed_at.desc()).all()
        
        return {
            'success': True,
            'data': [result.to_dict() for result in results]
        }, 200


@exams_ns.route('/results/<int:result_id>')
class ExamResultDetail(Resource):
    """Single exam result."""
    
    @jwt_required()
    @exams_ns.doc('get_exam_result', security='Bearer')
    def get(self, result_id):
        """Get exam result details."""
        current_user = get_current_user()
        result = ExamResult.query.get(result_id)
        
        if not result:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Result not found'
                }
            }, 404
        
        # Check permission
        is_owner = result.user_id == current_user.id
        is_teacher = result.exam.topic.course.teacher_id == current_user.id
        
        if not is_owner and not is_teacher and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You do not have permission to view this result'
                }
            }, 403
        
        include_answers = result.exam.show_answers_after or is_teacher or current_user.is_admin
        
        return {
            'success': True,
            'data': result.to_dict(include_answers=include_answers)
        }, 200
