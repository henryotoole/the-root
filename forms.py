from flask_wtf import FlaskForm
import wtforms
from wtforms import StringField, IntegerField, PasswordField, SubmitField, DecimalField, SelectField
from wtforms.validators import DataRequired, Email, Length, NumberRange

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
	
class TransactionForm(FlaskForm):
	amt = DecimalField('Amount', validators=[DataRequired(message='You must provide an amount!'), NumberRange(max = 999999999.99, message='Amount too high.')])
	
	method = SelectField('Method', coerce=int)
	type = SelectField('Type', coerce=int)
	dest = SelectField('Recipient')
	
	dest_optional = email = StringField('Recipient', validators=[Length(max=127, message='Destination name limited to 127 characters.')])
	desc = email = StringField('Description', validators=[Length(max=255, message='Destination name limited to 255 characters.')])
	submit = SubmitField('Submit')