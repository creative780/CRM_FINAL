FROM python:3.12-slim
WORKDIR /app
COPY Backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY Backend /app/Backend
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["python", "Backend/manage.py", "runserver", "0.0.0.0:8000"]

