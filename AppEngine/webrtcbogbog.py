import cgi
import urllib
import webapp2
import jinja2
import os
import logging
from datetime import datetime

from google.appengine.ext import ndb
from google.appengine.ext.db import GqlQuery

jinja_environment = jinja2.Environment(
	loader = jinja2.FileSystemLoader(os.path.dirname(__file__)))

class Greeting(ndb.Model):
	userID = ndb.StringProperty(required=True)
	dateAquired = ndb.DateTimeProperty(auto_now_add = True)
	dateLastAccessed = ndb.DateTimeProperty()


class MainPage(webapp2.RequestHandler):
	def get(self):
		#userID = Greeting.gql("WHERE userID == " + "\'" + userIDQuery + "\'")
		template = jinja_environment.get_template('index.html')
		self.response.out.write(template.render())


app = webapp2.WSGIApplication([
	('/', MainPage)
], debug = False)
