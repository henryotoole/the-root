#flask-SQLAlchemy
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()

#flask-login
import flask_login
login_manager = flask_login.LoginManager()
login_manager.login_view = "login"

#flask-wtforms
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect()