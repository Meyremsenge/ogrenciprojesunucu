"""
Courses API endpoints.
"""

from flask import request, g
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_current_user
from slugify import slugify
import re

from app.extensions import db
from app.models.user import Role
from app.models.course import Course, Topic, Category, Enrollment, EnrollmentStatus
from app.api.decorators import teacher_required, admin_required

courses_ns = Namespace('courses', description='Course management operations')

# Request/Response Models
course_model = courses_ns.model('Course', {
    'id': fields.Integer(description='Course ID'),
    'title': fields.String(description='Course title'),
    'description': fields.String(description='Course description'),
    'short_description': fields.String(description='Short description'),
    'thumbnail_url': fields.String(description='Thumbnail URL'),
    'price': fields.Float(description='Course price'),
    'currency': fields.String(description='Currency'),
    'is_free': fields.Boolean(description='Is free course'),
    'is_published': fields.Boolean(description='Is published'),
    'slug': fields.String(description='URL slug'),
    'total_students': fields.Integer(description='Total enrolled students'),
    'total_videos': fields.Integer(description='Total videos'),
    'total_duration_minutes': fields.Integer(description='Total duration in minutes'),
})

course_create_model = courses_ns.model('CourseCreate', {
    'title': fields.String(required=True, description='Course title'),
    'description': fields.String(description='Course description'),
    'short_description': fields.String(description='Short description'),
    'thumbnail_url': fields.String(description='Thumbnail URL'),
    'price': fields.Float(description='Course price', default=0),
    'currency': fields.String(description='Currency', default='TRY'),
    'is_free': fields.Boolean(description='Is free course', default=False),
    'category_id': fields.Integer(description='Category ID'),
})

topic_model = courses_ns.model('Topic', {
    'id': fields.Integer(description='Topic ID'),
    'title': fields.String(description='Topic title'),
    'description': fields.String(description='Topic description'),
    'order_index': fields.Integer(description='Order index'),
    'is_published': fields.Boolean(description='Is published'),
    'is_free_preview': fields.Boolean(description='Is free preview'),
})

topic_create_model = courses_ns.model('TopicCreate', {
    'title': fields.String(required=True, description='Topic title'),
    'description': fields.String(description='Topic description'),
    'order_index': fields.Integer(description='Order index'),
    'is_free_preview': fields.Boolean(description='Is free preview', default=False),
})


def generate_slug(title, course_id=None):
    """Generate unique slug for course."""
    # Simple slugify without external library
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    slug = re.sub(r'[-\s]+', '-', slug).strip('-')
    
    base_slug = slug
    counter = 1
    
    while True:
        query = Course.query.filter_by(slug=slug)
        if course_id:
            query = query.filter(Course.id != course_id)
        
        if not query.first():
            return slug
        
        slug = f'{base_slug}-{counter}'
        counter += 1


@courses_ns.route('')
class CourseList(Resource):
    """Course list and creation endpoints."""
    
    @courses_ns.doc('list_courses')
    @courses_ns.param('page', 'Page number', type=int, default=1)
    @courses_ns.param('per_page', 'Items per page', type=int, default=20)
    @courses_ns.param('category_id', 'Filter by category', type=int)
    @courses_ns.param('teacher_id', 'Filter by teacher', type=int)
    @courses_ns.param('search', 'Search by title')
    @courses_ns.param('is_free', 'Filter free courses', type=bool)
    def get(self):
        """Get list of published courses."""
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category_id = request.args.get('category_id', type=int)
        teacher_id = request.args.get('teacher_id', type=int)
        search = request.args.get('search', '').strip()
        is_free = request.args.get('is_free')
        
        query = Course.query.filter_by(is_published=True)
        
        if category_id:
            query = query.filter(Course.category_id == category_id)
        
        if teacher_id:
            query = query.filter(Course.teacher_id == teacher_id)
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                db.or_(
                    Course.title.ilike(search_term),
                    Course.description.ilike(search_term)
                )
            )
        
        if is_free is not None:
            is_free_bool = is_free.lower() == 'true' if isinstance(is_free, str) else is_free
            query = query.filter(Course.is_free == is_free_bool)
        
        # Order by featured first, then by creation date
        query = query.order_by(Course.is_featured.desc(), Course.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            'success': True,
            'data': [course.to_dict() for course in pagination.items],
            'meta': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'total_pages': pagination.pages
            }
        }, 200
    
    @jwt_required()
    @teacher_required
    @courses_ns.expect(course_create_model)
    @courses_ns.doc('create_course', security='Bearer')
    def post(self):
        """Create a new course (Teacher+)."""
        current_user = g.current_user
        data = request.get_json()
        
        title = data.get('title', '').strip()
        
        if not title:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Course title is required'
                }
            }, 400
        
        course = Course(
            title=title,
            description=data.get('description', ''),
            short_description=data.get('short_description', ''),
            thumbnail_url=data.get('thumbnail_url'),
            price=data.get('price', 0),
            currency=data.get('currency', 'TRY'),
            is_free=data.get('is_free', False),
            category_id=data.get('category_id'),
            teacher_id=current_user.id,
            slug=generate_slug(title)
        )
        
        db.session.add(course)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Course created successfully',
            'data': course.to_dict()
        }, 201


@courses_ns.route('/<int:course_id>')
class CourseDetail(Resource):
    """Single course operations."""
    
    @courses_ns.doc('get_course')
    def get(self, course_id):
        """Get course by ID."""
        course = Course.query.get(course_id)
        
        if not course:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Course not found'
                }
            }, 404
        
        return {
            'success': True,
            'data': course.to_dict(include_topics=True)
        }, 200
    
    @jwt_required()
    @courses_ns.expect(course_create_model)
    @courses_ns.doc('update_course', security='Bearer')
    def put(self, course_id):
        """Update course."""
        current_user = get_current_user()
        course = Course.query.get(course_id)
        
        if not course:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Course not found'
                }
            }, 404
        
        # Check permission
        if course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only update your own courses'
                }
            }, 403
        
        data = request.get_json()
        
        if 'title' in data:
            course.title = data['title'].strip()
            course.slug = generate_slug(data['title'], course.id)
        if 'description' in data:
            course.description = data['description']
        if 'short_description' in data:
            course.short_description = data['short_description']
        if 'thumbnail_url' in data:
            course.thumbnail_url = data['thumbnail_url']
        if 'price' in data:
            course.price = data['price']
        if 'currency' in data:
            course.currency = data['currency']
        if 'is_free' in data:
            course.is_free = data['is_free']
        if 'category_id' in data:
            course.category_id = data['category_id']
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Course updated successfully',
            'data': course.to_dict()
        }, 200
    
    @jwt_required()
    @courses_ns.doc('delete_course', security='Bearer')
    def delete(self, course_id):
        """Delete course."""
        current_user = get_current_user()
        course = Course.query.get(course_id)
        
        if not course:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Course not found'
                }
            }, 404
        
        # Check permission
        if course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only delete your own courses'
                }
            }, 403
        
        db.session.delete(course)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Course deleted successfully'
        }, 200


@courses_ns.route('/<int:course_id>/publish')
class CoursePublish(Resource):
    """Course publishing."""
    
    @jwt_required()
    @courses_ns.doc('publish_course', security='Bearer')
    def post(self, course_id):
        """Publish a course."""
        current_user = get_current_user()
        course = Course.query.get(course_id)
        
        if not course:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Course not found'
                }
            }, 404
        
        if course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only publish your own courses'
                }
            }, 403
        
        course.publish()
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Course published successfully',
            'data': course.to_dict()
        }, 200
    
    @jwt_required()
    @courses_ns.doc('unpublish_course', security='Bearer')
    def delete(self, course_id):
        """Unpublish a course."""
        current_user = get_current_user()
        course = Course.query.get(course_id)
        
        if not course:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Course not found'
                }
            }, 404
        
        if course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only unpublish your own courses'
                }
            }, 403
        
        course.unpublish()
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Course unpublished successfully',
            'data': course.to_dict()
        }, 200


@courses_ns.route('/<int:course_id>/enroll')
class CourseEnroll(Resource):
    """Course enrollment."""
    
    @jwt_required()
    @courses_ns.doc('enroll_course', security='Bearer')
    def post(self, course_id):
        """Enroll in a course."""
        current_user = get_current_user()
        course = Course.query.get(course_id)
        
        if not course:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Course not found'
                }
            }, 404
        
        if not course.is_published:
            return {
                'success': False,
                'error': {
                    'code': 'COURSE_NOT_AVAILABLE',
                    'message': 'This course is not available for enrollment'
                }
            }, 400
        
        # Check if already enrolled
        existing = Enrollment.query.filter_by(
            user_id=current_user.id,
            course_id=course_id
        ).first()
        
        if existing:
            return {
                'success': False,
                'error': {
                    'code': 'ALREADY_ENROLLED',
                    'message': 'You are already enrolled in this course'
                }
            }, 400
        
        # For paid courses, payment would be processed here
        # For now, we'll just allow free enrollment
        if not course.is_free and course.price > 0:
            return {
                'success': False,
                'error': {
                    'code': 'PAYMENT_REQUIRED',
                    'message': 'Payment is required for this course'
                }
            }, 402
        
        enrollment = Enrollment(
            user_id=current_user.id,
            course_id=course_id,
            status=EnrollmentStatus.ACTIVE.value,
            amount_paid=0
        )
        
        db.session.add(enrollment)
        
        # Update course statistics
        course.total_students = (course.total_students or 0) + 1
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Enrolled successfully',
            'data': enrollment.to_dict()
        }, 201


@courses_ns.route('/<int:course_id>/topics')
class CourseTopics(Resource):
    """Course topics management."""
    
    @courses_ns.doc('list_topics')
    def get(self, course_id):
        """Get course topics."""
        course = Course.query.get(course_id)
        
        if not course:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Course not found'
                }
            }, 404
        
        topics = course.topics.order_by(Topic.order_index).all()
        
        return {
            'success': True,
            'data': [topic.to_dict(include_content=True) for topic in topics]
        }, 200
    
    @jwt_required()
    @courses_ns.expect(topic_create_model)
    @courses_ns.doc('create_topic', security='Bearer')
    def post(self, course_id):
        """Create a new topic in course."""
        current_user = get_current_user()
        course = Course.query.get(course_id)
        
        if not course:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'Course not found'
                }
            }, 404
        
        if course.teacher_id != current_user.id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only add topics to your own courses'
                }
            }, 403
        
        data = request.get_json()
        
        # Get max order index
        max_order = db.session.query(db.func.max(Topic.order_index)).filter(
            Topic.course_id == course_id
        ).scalar() or 0
        
        topic = Topic(
            course_id=course_id,
            title=data.get('title', '').strip(),
            description=data.get('description', ''),
            order_index=data.get('order_index', max_order + 1),
            is_free_preview=data.get('is_free_preview', False)
        )
        
        db.session.add(topic)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Topic created successfully',
            'data': topic.to_dict()
        }, 201


@courses_ns.route('/my-courses')
class MyCourses(Resource):
    """Current user's enrolled courses (as student) or created courses (as teacher)."""
    
    @jwt_required()
    @courses_ns.doc('my_courses', security='Bearer')
    def get(self):
        """
        Get user's courses based on role.
        
        - Students: Returns enrolled courses
        - Teachers/Admins: Returns created courses
        """
        from flask_jwt_extended import get_current_user
        
        current_user = get_current_user()
        if not current_user:
            return {
                'success': False,
                'error': {'code': 'UNAUTHORIZED', 'message': 'Kullanıcı bulunamadı'}
            }, 401
        
        user_role = current_user.role.name if current_user.role else 'student'
        
        # Öğretmen veya admin ise oluşturduğu kursları döndür
        if user_role in ['teacher', 'admin', 'super_admin']:
            courses = Course.query.filter_by(teacher_id=current_user.id).order_by(
                Course.created_at.desc()
            ).all()
            
            return {
                'success': True,
                'data': [course.to_dict() for course in courses]
            }, 200
        
        # Öğrenci ise kayıtlı olduğu kursları döndür
        enrollments = Enrollment.query.filter_by(
            user_id=current_user.id,
            status=EnrollmentStatus.ACTIVE.value
        ).order_by(Enrollment.enrolled_at.desc()).all()
        
        return {
            'success': True,
            'data': [enrollment.to_dict() for enrollment in enrollments]
        }, 200


@courses_ns.route('/my-enrollments')
class MyEnrollments(Resource):
    """Current user's enrollments (as student)."""
    
    @jwt_required()
    @courses_ns.doc('my_enrollments', security='Bearer')
    def get(self):
        """Get courses enrolled by current user."""
        current_user = get_current_user()
        
        enrollments = Enrollment.query.filter_by(
            user_id=current_user.id
        ).order_by(Enrollment.enrolled_at.desc()).all()
        
        return {
            'success': True,
            'data': [enrollment.to_dict() for enrollment in enrollments]
        }, 200
