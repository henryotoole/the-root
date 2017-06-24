from flask_wtf import FlaskForm
import wtforms
from wtforms import StringField, IntegerField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Email

class CSRFForm(FlaskForm):
	pass

class LoginForm(FlaskForm):
	email = StringField('email', validators=[DataRequired()])
	password = PasswordField('password', validators=[DataRequired()])
	submit = SubmitField('Login')

class CreateForm(FlaskForm):
	email_create = StringField('email_create', validators=[DataRequired(), Email()])
	password = PasswordField(
		'password',
		[
			wtforms.validators.DataRequired(),
			wtforms.validators.EqualTo('password_conf', message='Passwords do not match')
		])
	password_conf = PasswordField('password_conf', validators=[DataRequired()])
	submit = SubmitField('Create Account')
	
class DeviceCreateForm(FlaskForm):
	number = IntegerField('number', default=1) # The number of devices to create.