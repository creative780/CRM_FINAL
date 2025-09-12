PY=./.venv/Scripts/python
MANAGE=$(PY) Backend/manage.py

up:
	$(MANAGE) runserver 0.0.0.0:8000

migrate:
	$(MANAGE) migrate

seed:
	$(MANAGE) seed_demo

test:
	$(PY) -m pytest -q
