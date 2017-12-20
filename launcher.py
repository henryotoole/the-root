#launcher.py
#A file which facilitates the 'launching' of the various apps. Handles outward-facing user self-administration as well.

from the_root import app

import flask
from flask_login import login_required, current_user

from flask import render_template, redirect, request, jsonify






#=================================== Flask functions ==========================================

#Overview for the minecraft server controller.
@app.route("/launcher", methods=['GET', 'POST'])
#@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def launcher():

	return render_template("/launcher.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])
