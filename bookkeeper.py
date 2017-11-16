#bookkeeper.py
#
#This service's name is Reginald. He keeps the books.
#
#Reginald takes GET/POST requests describing a purchase/transaction and adds them to a database. He can then provide some
#metrics about your spending habits, etc.

from the_root.extensions import db
from the_root import app
from the_root.forms import TransactionForm
from the_root.models import Transaction, Method, Type

import flask
from flask_login import login_required, current_user

from flask import render_template, redirect, request, jsonify

import datetime

@app.route("/reginald", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def reginald_main():

	message = 'Reginald sighs. "You really should take better care of your finances"' # Default
	message = request.values.get('message', type=str, default=message)
	
	
	return render_template("/reginald/reginald.html", message=message, sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])

@app.route("/reginald/transaction/<t_type>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def reginald_transaction(t_type):
	form = TransactionForm()
	#Generate select field entries
	form.method.choices = [(m.id, m.name) for m in Method.query.all()]
	income = False
	if(t_type == 'income'):
		form.dest.label = 'Source'
		form.dest_optional.label = 'Source'
		form.type.choices = [(t.id, t.name) for t in Type.query.filter_by(income=True).all()]
		form.dest.choices = [(dest, dest) for dest in Transaction.get_common_srcdest(5, True)]
		income = True
	elif(t_type == 'expense'):
		form.dest.label = 'Recipient'
		form.dest_optional.label = 'Recipient'
		form.type.choices = [(t.id, t.name) for t in Type.query.filter_by(income=False).all()]
		form.dest.choices = [(dest, dest) for dest in Transaction.get_common_srcdest(5, False)]
	else:
		return '', 404
	form.dest.choices.append(('__OTHER__', 'Other')) # Add the 'other' option.
	if form.validate_on_submit():
		amt = form.amt.data
		
		method = form.method.data
		type = form.type.data # ID of type of transaction
		dest = form.dest.data # 
		if(dest == '__OTHER__'):
			dest = form.dest_optional.data
		desc = form.desc.data
		
		trans = Transaction(amt, income, type, method, srcdest = dest, desc = desc)
		db.session.add(trans)
		db.session.commit()
		#No user of that name.
		return redirect('/reginald?message=REGINALD SAYS HI!!!!')
	else:
		
		return render_template("/reginald/expenditure.html", form=form, sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])
		
#

#Render a greensheet for the current user across a date range
#Dates in format DDMMYYYY
@app.route("/reginald/greensheet", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def greensheet():
	return render_template("/reginald/greensheet.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])


#Dates in format YYYY-MM-DD
@app.route("/reginald/greensheet/<query>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def greensheet_query(query):
	if(query=='records_for_day'):
		date = request.values.get('date', type=str)
		if(date is None):
			return "Bad params", 404
		try:
			date = datetime.datetime.strptime(date + ' 23:59', "%Y-%m-%d %H:%M")
		except ValueError:
			return "Time format wrong", 415

		list = Transaction.getDate(date)

		return jsonify(list), 200
	elif(query=='types'):
		types = Type.query.all()
		list = [type.getDict() for type in types]
		
		return jsonify(list), 200
	#Note: It's best to get multiple in one request for A) performance reasons and B) to make it easier to order them server-side.
	#This will return a list of lists of records for EVERY DAY IN THE RANGE, meaning empty arrays are returned for days with no records.
	elif(query=='records_for_range'):
		#Note: Dates can be in either order, but must be in YYYY-MM-DD format.
		date1 = request.values.get('date1', type=str)
		date2 = request.values.get('date2', type=str)
		date_start = None
		date_end = None
		if(date1 is None or date2 is None):
			return "Bad params", 404
		try:
			date1 = datetime.datetime.strptime(date1 + ' 23:59', "%Y-%m-%d %H:%M")
			date2 = datetime.datetime.strptime(date2 + ' 23:59', "%Y-%m-%d %H:%M")
			#Ensure date_start is chronologically before date_end
			if(date1 < date2):
				date_start = date1
				date_end = date2
			else:
				date_start = date2
				date_end = date1
		except ValueError:
			return "Time format wrong", 415\
		#Empty list of days to populate (in order)
		days = []
		
		#Loop through every day in the range.
		delta = datetime.timedelta(days=1)
		d = date_start
		while d <= date_end:
			days.append(Transaction.getDate(d))
			d += delta
		
		data = {'days': days, 'balance_at_start': str(Transaction.getBalanceUpTo(date_start))}
		return jsonify(data), 200
	elif(query=='daterange_all'): # Get start and end dates of entire body of records.
		start = Transaction.query.filter_by(user=current_user.id).order_by(Transaction.time.desc()).first().time
		end = Transaction.query.filter_by(user=current_user.id).order_by(Transaction.time.asc()).first().time
		data = {
			'start': datetime.datetime.strftime(start, '%Y-%m-%d'),
			'end': datetime.datetime.strftime(end, '%Y-%m-%d')
		}
		return jsonify(data), 200
	#Sum every transaction for a user and return the balance
	elif(query=='total_balance'):
		return jsonify(str(Transaction.getBalance())), 200
#
















