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

# ============================================================
# STANDALONE EXAM ENDPOINTS (Topic-independent)
# ============================================================

@exams_ns.route('/')
class ExamList(Resource):
    """List and create exams (standalone, not tied to topic)."""    
    @jwt_required()
    @exams_ns.doc('list_exams', security='Bearer')
    def get(self):
        """List all exams for current teacher."""
        current_user = get_current_user()
        
        # Query params
        search = request.args.get('search', '')
        grade_level = request.args.get('grade_level')
        status = request.args.get('status')
        
        query = Exam.query
        
        # Filter by owner (teacher's exams)
        if not current_user.is_admin:
            query = query.filter(Exam.created_by == current_user.id)
        
        if search:
            query = query.filter(Exam.title.ilike(f'%{search}%'))
        if grade_level:
            query = query.filter(Exam.grade_level == grade_level)
        if status:
            query = query.filter(Exam.status == status)
        
        exams = query.order_by(Exam.created_at.desc()).all()
        
        return {
            'success': True,
            'data': {
                'items': [e.to_dict() for e in exams],
                'total': len(exams)
            }
        }, 200
    
    @jwt_required()
    @teacher_required
    @exams_ns.doc('create_standalone_exam', security='Bearer')
    def post(self):
        """Create a standalone exam/quiz."""
        current_user = g.current_user
        data = request.get_json()
        
        title = data.get('title', '').strip()
        if not title:
            return {
                'success': False,
                'error': {'code': 'VALIDATION_ERROR', 'message': 'Title is required'}
            }, 400
        
        exam = Exam(
            title=title,
            description=data.get('description'),
            exam_type=data.get('exam_type', 'quiz'),
            grade_level=data.get('grade_level'),
            duration_minutes=data.get('duration_minutes', 30),
            pass_score=data.get('pass_score', 60),
            max_attempts=data.get('max_attempts', 1),
            status='draft',
            created_by=current_user.id,
            owner_type='teacher'
        )
        
        db.session.add(exam)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Exam created successfully',
            'data': exam.to_dict()
        }, 201


@exams_ns.route('/<int:exam_id>/questions')
class ExamQuestions(Resource):
    """Manage questions in an exam."""
    
    @jwt_required()
    @exams_ns.doc('get_exam_questions', security='Bearer')
    def get(self, exam_id):
        """Get all questions in an exam."""
        current_user = get_current_user()
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {'code': 'NOT_FOUND', 'message': 'Exam not found'}
            }, 404
        
        # Get questions directly from exam relationship
        questions_data = []
        for q in exam.questions:
            q_type = q.question_type.value if hasattr(q.question_type, 'value') else q.question_type
            questions_data.append({
                'id': q.id,
                'question_text': q.question_text,
                'question_type': q_type,
                'points': q.points,
                'answers': [
                    {
                        'id': a.id,
                        'answer_text': a.answer_text,
                        'is_correct': a.is_correct
                    } for a in q.answers
                ]
            })
        
        return {
            'success': True,
            'data': questions_data
        }, 200
    
    @jwt_required()
    @teacher_required
    @exams_ns.doc('add_question_to_exam', security='Bearer')
    def post(self, exam_id):
        """Add a new question to exam."""
        current_user = g.current_user
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {'code': 'NOT_FOUND', 'message': 'Exam not found'}
            }, 404
        
        # Check ownership
        if exam.created_by != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {'code': 'FORBIDDEN', 'message': 'Not authorized'}
            }, 403
        
        data = request.get_json()
        
        question_text = data.get('question_text', '').strip()
        if not question_text:
            return {
                'success': False,
                'error': {'code': 'VALIDATION_ERROR', 'message': 'Question text is required'}
            }, 400
        
        # Create the question linked to exam
        from app.modules.exams.models import Question as ExamQuestion, Answer, QuestionType
        
        # Get order index
        order_idx = len(exam.questions)
        
        question = ExamQuestion(
            exam_id=exam_id,
            question_text=question_text,
            question_type=data.get('question_type', 'single_choice'),
            points=data.get('points', 10),
            order=order_idx
        )
        db.session.add(question)
        db.session.flush()
        
        # Add answers
        answers_data = data.get('answers', [])
        for idx, ans in enumerate(answers_data):
            answer = Answer(
                question_id=question.id,
                answer_text=ans.get('answer_text', ''),
                is_correct=ans.get('is_correct', False),
                order=idx
            )
            db.session.add(answer)
        
        # Update exam stats
        exam.total_questions = len(exam.questions) + 1
        exam.total_points = (exam.total_points or 0) + question.points
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Question added successfully',
            'data': {
                'id': question.id,
                'question_text': question.question_text,
                'question_type': question.question_type.value if hasattr(question.question_type, 'value') else question.question_type,
                'points': question.points
            }
        }, 201


@exams_ns.route('/<int:exam_id>/questions/<int:question_id>')
class ExamQuestionDetail(Resource):
    """Update/delete a question in exam."""
    
    @jwt_required()
    @teacher_required
    @exams_ns.doc('update_exam_question', security='Bearer')
    def put(self, exam_id, question_id):
        """Update a question."""
        current_user = g.current_user
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {'code': 'NOT_FOUND', 'message': 'Exam not found'}
            }, 404
        
        from app.modules.exams.models import Question as ExamQuestionModel, Answer
        
        question = ExamQuestionModel.query.filter_by(id=question_id, exam_id=exam_id).first()
        if not question:
            return {
                'success': False,
                'error': {'code': 'NOT_FOUND', 'message': 'Question not found in this exam'}
            }, 404
        
        data = request.get_json()
        
        if 'question_text' in data:
            question.question_text = data['question_text']
        if 'question_type' in data:
            question.question_type = data['question_type']
        if 'points' in data:
            question.points = data['points']
        
        # Update answers if provided
        if 'answers' in data:
            # Delete existing answers
            Answer.query.filter_by(question_id=question_id).delete()
            
            # Add new answers
            for idx, ans in enumerate(data['answers']):
                answer = Answer(
                    question_id=question_id,
                    answer_text=ans.get('answer_text', ''),
                    is_correct=ans.get('is_correct', False),
                    order=idx
                )
                db.session.add(answer)
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Question updated successfully'
        }, 200
    
    @jwt_required()
    @teacher_required
    @exams_ns.doc('delete_exam_question', security='Bearer')
    def delete(self, exam_id, question_id):
        """Remove a question from exam."""
        current_user = g.current_user
        
        from app.modules.exams.models import Question as ExamQuestionModel
        
        question = ExamQuestionModel.query.filter_by(id=question_id, exam_id=exam_id).first()
        
        if not question:
            return {
                'success': False,
                'error': {'code': 'NOT_FOUND', 'message': 'Question not in exam'}
            }, 404
        
        # Update exam stats
        exam = Exam.query.get(exam_id)
        if exam:
            exam.total_questions = max(0, (exam.total_questions or 0) - 1)
            exam.total_points = max(0, (exam.total_points or 0) - (question.points or 0))
        
        db.session.delete(question)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Question removed from exam'
        }, 200


@exams_ns.route('/<int:exam_id>/publish')
class ExamPublish(Resource):
    """Publish an exam."""
    
    @jwt_required()
    @teacher_required
    @exams_ns.doc('publish_exam', security='Bearer')
    def post(self, exam_id):
        """Publish an exam."""
        current_user = g.current_user
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {'code': 'NOT_FOUND', 'message': 'Exam not found'}
            }, 404
        
        exam.status = 'published'
        exam.is_published = True
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Exam published successfully'
        }, 200


@exams_ns.route('/<int:exam_id>/unpublish')
class ExamUnpublish(Resource):
    """Unpublish an exam."""
    
    @jwt_required()
    @teacher_required
    @exams_ns.doc('unpublish_exam', security='Bearer')
    def post(self, exam_id):
        """Unpublish an exam."""
        current_user = g.current_user
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {'code': 'NOT_FOUND', 'message': 'Exam not found'}
            }, 404
        
        exam.status = 'draft'
        exam.is_published = False
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Exam unpublished successfully'
        }, 200


@exams_ns.route('/<int:exam_id>/duplicate')
class ExamDuplicate(Resource):
    """Duplicate an exam."""
    
    @jwt_required()
    @teacher_required
    @exams_ns.doc('duplicate_exam', security='Bearer')
    def post(self, exam_id):
        """Duplicate an exam."""
        current_user = g.current_user
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return {
                'success': False,
                'error': {'code': 'NOT_FOUND', 'message': 'Exam not found'}
            }, 404
        
        from app.modules.exams.models import Question as ExamQuestionModel, Answer
        
        # Create copy
        new_exam = Exam(
            title=f"{exam.title} (Kopya)",
            description=exam.description,
            exam_type=exam.exam_type,
            grade_level=exam.grade_level,
            duration_minutes=exam.duration_minutes,
            pass_score=exam.pass_score,
            max_attempts=exam.max_attempts,
            status='draft',
            created_by=current_user.id,
            owner_type='teacher'
        )
        db.session.add(new_exam)
        db.session.flush()
        
        # Copy questions with their answers
        for q in exam.questions:
            new_question = ExamQuestionModel(
                exam_id=new_exam.id,
                question_text=q.question_text,
                question_type=q.question_type,
                points=q.points,
                order=q.order,
                image_url=q.image_url,
                explanation=q.explanation
            )
            db.session.add(new_question)
            db.session.flush()
            
            # Copy answers
            for a in q.answers:
                new_answer = Answer(
                    question_id=new_question.id,
                    answer_text=a.answer_text,
                    is_correct=a.is_correct,
                    order=a.order if hasattr(a, 'order') else 0
                )
                db.session.add(new_answer)
        
        new_exam.total_questions = len(exam.questions)
        new_exam.total_points = exam.total_points
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Exam duplicated successfully',
            'data': new_exam.to_dict()
        }, 201
