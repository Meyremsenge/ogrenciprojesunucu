

# ============================================================
# STANDALONE EXAM ENDPOINTS (Topic-independent)
# ============================================================

@exams_ns.route('/')
class ExamList(Resource):
    """List and create exams (standalone, not tied to topic).""    
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
>>>>>>> eski/main
