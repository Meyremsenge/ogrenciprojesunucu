from flask import jsonify, request
from app.extensions import db
from app.models.student import Student
from app.modules.students import students_bp


@students_bp.get("/api/v1/students")
def list_students():
    students = Student.query.order_by(Student.id.desc()).all()  # tüm öğrenciler [web:622][web:625]
    data = [s.to_dict() for s in students]

    return jsonify({
        "success": True,
        "data": data,
        "message": "Students listed successfully"
    }), 200


@students_bp.post("/api/v1/students")
def create_student():
    payload = request.get_json() or {}  # gelen JSON gövdesi [web:638][web:642]

    first_name = payload.get("first_name")
    last_name = payload.get("last_name")
    email = payload.get("email")
    grade = payload.get("grade")

    # Basit doğrulama
    if not first_name or not last_name or not email:
        return jsonify({
            "success": False,
            "message": "first_name, last_name ve email zorunludur"
        }), 400

    # Yeni öğrenci oluştur
    student = Student(
        first_name=first_name,
        last_name=last_name,
        email=email,
        grade=grade,
    )
    db.session.add(student)
    db.session.commit()  # veritabanına kaydet [web:622][web:632]

    return jsonify({
        "success": True,
        "data": student.to_dict(),
        "message": "Student created successfully"
    }), 201

@students_bp.get("/api/v1/students/<int:student_id>")
def get_student(student_id: int):
    student = Student.query.get_or_404(student_id)  # kayıt yoksa 404 [web:622]
    return jsonify({
        "success": True,
        "data": student.to_dict(),
        "message": "Student detail fetched successfully"
    }), 200


@students_bp.put("/api/v1/students/<int:student_id>")
def update_student(student_id: int):
    student = Student.query.get_or_404(student_id)

    payload = request.get_json() or {}
    first_name = payload.get("first_name", student.first_name)
    last_name = payload.get("last_name", student.last_name)
    email = payload.get("email", student.email)
    grade = payload.get("grade", student.grade)

    # Basit doğrulama
    if not first_name or not last_name or not email:
        return jsonify({
            "success": False,
            "message": "first_name, last_name ve email zorunludur"
        }), 400

    student.first_name = first_name
    student.last_name = last_name
    student.email = email
    student.grade = grade

    db.session.commit()  # değişiklikleri kaydet [web:622][web:632]

    return jsonify({
        "success": True,
        "data": student.to_dict(),
        "message": "Student updated successfully"
    }), 200


@students_bp.delete("/api/v1/students/<int:student_id>")
def delete_student(student_id: int):
    student = Student.query.get_or_404(student_id)

    db.session.delete(student)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Student deleted successfully"
    }), 200
