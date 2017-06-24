from functools import wraps
from flask import g, request, redirect, url_for
from flask_login import current_user

from luxedo.models import Privilege

def admin_required(f): # Tested, works.
	@wraps(f) # https://stackoverflow.com/questions/308999/what-does-functools-wraps-do
	def decorated_function(*args, **kwargs):
		if not Privilege.query.filter_by(userid=current_user.id).filter_by(tag='admin').first(): # If no admin tag for this user.
			return "Must be admin", 403
		return f(*args, **kwargs)
	return decorated_function