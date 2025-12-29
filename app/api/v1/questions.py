"""
Questions API endpoints.
"""

from flask import request, g
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_current_user

from app.extensions import db
from app.models.course import Topic
from app.models.question import Question, Answer, QuestionAttempt, QuestionType, DifficultyLevel
from app.api.decorators import teacher_required

questions_ns = Namespace('questions', description='Question management operations')

# Request/Response Models
answer_model = questions_ns.model('Answer', {
    'id': fields.Integer(description='Answer ID'),
    'answer_text': fields.String(description='Answer text'),
    'order_index': fields.Integer(description='Order index'),
})

question_model = questions_ns.model('Question', {
    'id': fields.Integer(description='Question ID'),
    'topic_id': fields.Integer(description='Topic ID'),
    'question_text': fields.String(description='Question text'),
    'question_type': fields.String(description='Question type'),
    'difficulty': fields.String(description='Difficulty level'),
    'points': fields.Integer(description='Points'),
    'hint': fields.String(description='Hint'),
    'is_published': fields.Boolean(description='Is published'),
    'answers': fields.List(fields.Nested(answer_model)),
})

answer_create_model = questions_ns.model('AnswerCreate', {
    'answer_text': fields.String(required=True, description='Answer text'),
    'is_correct': fields.Boolean(required=True, description='Is correct answer'),
    'order_index': fields.Integer(description='Order index'),
})

question_create_model = questions_ns.model('QuestionCreate', {
    'question_text': fields.String(required=True, description='Question text'),
    'question_type': fields.String(description='Question type', default='multiple_choice'),
    'difficulty': fields.String(description='Difficulty level', default='medium'),
    'points': fields.Integer(description='Points', default=1),
    'explanation': fields.String(description='Explanation shown after answering'),
    'hint': fields.String(description='Optional hint'),
    'image_url': fields.String(description='Image URL'),
    'tags': fields.List(fields.String, description='Tags'),
    'answers': fields.List(fields.Nested(answer_create_model), description='Answer options'),
})

submit_answer_model = questions_ns.model('SubmitAnswer', {
    'answer_ids': fields.List(fields.Integer, required=True, description='Selected answer IDs'),
    'time_spent_seconds': fields.Integer(description='Time spent on question'),
})


@questions_ns.route('/topic/<int:topic_id>')
class TopicQuestions(Resource):
    """Questions by topic."""
    
    @jwt_required()
    @questions_ns.doc('list_topic_questions', security='Bearer')
    @questions_ns.param('difficulty', 'Filter by difficulty')
    @questions_ns.param('type', 'Filter by question type')
    def get(self, topic_id):
        """Get questions in a topic."""
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
        
        query = topic.questions.filter_by(is_published=True)
        
        difficulty = request.args.get('difficulty')
        if difficulty:
            query = query.filter(Question.difficulty == difficulty)
        
        question_type = request.args.get('type')
        if question_type:
            query = query.filter(Question.question_type == question_type)
        
        questions = query.all()
        
        # Don't include correct answers in listing
        return {
            'success': True,
            'data': [q.to_dict(include_answers=True, include_correct=False, user_id=current_user.id) 
                     for q in questions]
        }, 200
    
    @jwt_required()
    @teacher_required
    @questions_ns.expect(question_create_model)
    @questions_ns.doc('create_question', security='Bearer')
    def post(self, topic_id):
        """Create a new question in topic."""
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
                    'message': 'You can only add questions to your own courses'
                }
            }, 403
        
        data = request.get_json()
        
        question_text = data.get('question_text', '').strip()
        if not question_text:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Question text is required'
                }
            }, 400
        
        # Validate question type
        question_type = data.get('question_type', QuestionType.MULTIPLE_CHOICE.value)
        valid_types = [t.value for t in QuestionType]
        if question_type not in valid_types:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': f'Invalid question type. Valid types: {valid_types}'
                }
            }, 400
        
        # Validate difficulty
        difficulty = data.get('difficulty', DifficultyLevel.MEDIUM.value)
        valid_difficulties = [d.value for d in DifficultyLevel]
        if difficulty not in valid_difficulties:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': f'Invalid difficulty. Valid values: {valid_difficulties}'
                }
            }, 400
        
        # Validate answers
        answers_data = data.get('answers', [])
        if question_type in [QuestionType.MULTIPLE_CHOICE.value, QuestionType.MULTIPLE_SELECT.value]:
            if len(answers_data) < 2:
                return {
                    'success': False,
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'At least 2 answer options are required'
                    }
                }, 400
            
            has_correct = any(a.get('is_correct') for a in answers_data)
            if not has_correct:
                return {
                    'success': False,
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'At least one correct answer is required'
                    }
                }, 400
        
        # Create question
        question = Question(
            topic_id=topic_id,
            question_text=question_text,
            question_type=question_type,
            difficulty=difficulty,
            points=data.get('points', 1),
            explanation=data.get('explanation'),
            hint=data.get('hint'),
            image_url=data.get('image_url'),
            tags=data.get('tags', []),
            is_published=True
        )
        
        db.session.add(question)
        db.session.flush()  # Get question ID
        
        # Create answers
        for idx, answer_data in enumerate(answers_data):
            answer = Answer(
                question_id=question.id,
                answer_text=answer_data.get('answer_text', '').strip(),
                is_correct=answer_data.get('is_correct', False),
                order_index=answer_data.get('order_index', idx)
            )
            db.session.add(answer)
        
        # Update topic question count
        topic.total_questions = (topic.total_questions or 0) + 1
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Question created successfully',
            'data': question.to_dict(include_answers=True, include_correct=True)
        }, 201


@questions_ns.route('/<int:question_id>')
class QuestionDetail(Resource):
    """Single question operations."""
    
    @jwt_required()
    @questions_ns.doc('get_question', security='Bearer')
    def get(self, question_id):
        """Get question details."""
        question = Question.query.get(question_id)
        
        if not question:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Question not found'
                }
            }, 404
        
        current_user = get_current_user()
        
        # Include correct answers only for teachers/admins
        include_correct = (
            current_user.is_admin or 
            question.topic.course.teacher_id == current_user.id
        )
        
        return {
            'success': True,
            'data': question.to_dict(include_answers=True, include_correct=include_correct)
        }, 200
    
    @jwt_required()
    @teacher_required
    @questions_ns.expect(question_create_model)
    @questions_ns.doc('update_question', security='Bearer')
    def put(self, question_id):
        """Update question."""
        current_user = g.current_user
        question = Question.query.get(question_id)
        
        if not question:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Question not found'
                }
            }, 404
        
        # Check permission
        if question.topic.course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only update questions in your own courses'
                }
            }, 403
        
        data = request.get_json()
        
        if 'question_text' in data:
            question.question_text = data['question_text'].strip()
        if 'question_type' in data:
            question.question_type = data['question_type']
        if 'difficulty' in data:
            question.difficulty = data['difficulty']
        if 'points' in data:
            question.points = data['points']
        if 'explanation' in data:
            question.explanation = data['explanation']
        if 'hint' in data:
            question.hint = data['hint']
        if 'image_url' in data:
            question.image_url = data['image_url']
        if 'tags' in data:
            question.tags = data['tags']
        if 'is_published' in data:
            question.is_published = data['is_published']
        
        # Update answers if provided
        if 'answers' in data:
            # Delete existing answers
            Answer.query.filter_by(question_id=question.id).delete()
            
            # Create new answers
            for idx, answer_data in enumerate(data['answers']):
                answer = Answer(
                    question_id=question.id,
                    answer_text=answer_data.get('answer_text', '').strip(),
                    is_correct=answer_data.get('is_correct', False),
                    order_index=answer_data.get('order_index', idx)
                )
                db.session.add(answer)
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Question updated successfully',
            'data': question.to_dict(include_answers=True, include_correct=True)
        }, 200
    
    @jwt_required()
    @teacher_required
    @questions_ns.doc('delete_question', security='Bearer')
    def delete(self, question_id):
        """Delete question."""
        current_user = g.current_user
        question = Question.query.get(question_id)
        
        if not question:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Question not found'
                }
            }, 404
        
        # Check permission
        if question.topic.course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only delete questions from your own courses'
                }
            }, 403
        
        topic = question.topic
        
        db.session.delete(question)
        
        # Update topic question count
        topic.total_questions = max(0, (topic.total_questions or 0) - 1)
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Question deleted successfully'
        }, 200


@questions_ns.route('/<int:question_id>/answer')
class AnswerQuestion(Resource):
    """Answer a question (practice mode)."""
    
    @jwt_required()
    @questions_ns.expect(submit_answer_model)
    @questions_ns.doc('answer_question', security='Bearer')
    def post(self, question_id):
        """Submit an answer to a question."""
        current_user = get_current_user()
        question = Question.query.get(question_id)
        
        if not question:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Question not found'
                }
            }, 404
        
        data = request.get_json()
        answer_ids = data.get('answer_ids', [])
        time_spent = data.get('time_spent_seconds')
        
        if not answer_ids:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'At least one answer must be selected'
                }
            }, 400
        
        # Check answer
        is_correct, correct_ids = question.check_answer(answer_ids)
        
        # Record attempt
        attempt = QuestionAttempt(
            user_id=current_user.id,
            question_id=question_id,
            selected_answer_ids=answer_ids,
            is_correct=is_correct,
            time_spent_seconds=time_spent,
            context_type='practice'
        )
        
        db.session.add(attempt)
        
        # Update question statistics
        question.record_attempt(is_correct)
        
        db.session.commit()
        
        # Get correct answers for response
        correct_answers = [a.to_dict(include_correct=True) for a in question.answers if a.is_correct]
        
        return {
            'success': True,
            'data': {
                'is_correct': is_correct,
                'points_earned': question.points if is_correct else 0,
                'correct_answers': correct_answers,
                'explanation': question.explanation,
                'attempt_id': attempt.id
            }
        }, 200


@questions_ns.route('/<int:question_id>/statistics')
class QuestionStatistics(Resource):
    """Question statistics."""
    
    @jwt_required()
    @teacher_required
    @questions_ns.doc('get_question_statistics', security='Bearer')
    def get(self, question_id):
        """Get question statistics (Teacher+)."""
        question = Question.query.get(question_id)
        
        if not question:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Question not found'
                }
            }, 404
        
        # Get answer distribution
        answer_stats = []
        for answer in question.answers:
            count = QuestionAttempt.query.filter(
                QuestionAttempt.question_id == question_id,
                QuestionAttempt.selected_answer_ids.contains([answer.id])
            ).count()
            
            answer_stats.append({
                'answer_id': answer.id,
                'answer_text': answer.answer_text[:50] + '...' if len(answer.answer_text) > 50 else answer.answer_text,
                'is_correct': answer.is_correct,
                'selection_count': count,
                'selection_percent': (count / question.total_attempts * 100) if question.total_attempts > 0 else 0
            })
        
        return {
            'success': True,
            'data': {
                'question_id': question.id,
                'total_attempts': question.total_attempts,
                'correct_attempts': question.correct_attempts,
                'success_rate': round(question.success_rate, 1),
                'answer_distribution': answer_stats
            }
        }, 200
