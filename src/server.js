'use strict';

import path from 'path';
import { Server } from 'http';
import express from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { match, RouterContext } from 'react-router';
import routes from './routes';
import NotFoundPage from './components/NotFoundPage';
import Mongoose from './serv/dbconfig';
import Races from './serv/schemas/races';
import User from './serv/schemas/users';
import Results from './serv/schemas/results';
import passport from 'passport';
import util from './config/utility';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';


//passport
var Strategy = require('passport-facebook').Strategy;

passport.use(new Strategy({
  clientID: '630724287121611',
  clientSecret: '39b0e9bbb91cdb757f264099dff78b0b',
  callbackURL: 'http://localhost:3000/auth/facebook/callback'
},
  function(accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


// server setup
const app = new express();
const server = new Server(app);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'static')));
app.use(cookieParser('shhhh, very secret'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'shhh, it\'s a secret',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


// passport routes
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {

    User.findOne({ userId: req.user.id, displayName: req.user.displayName })
      .exec((err, found) => {
        if (!found) {
          var user = new User({
            userId: req.user.id,
            displayName: req.user.displayName
          });
          user.save((err, newUser) => {
            if (err) {
              console.log('failed');
            } else {
              console.log('user saved');
            }
          });
        }
      });

    res.redirect('/home');
  });


// wildcard route for react routing
app.get('*', util.isLoggedIn, (req, res) => {
  match(
    { routes, location: req.url },
    (err, redirectLocation, renderProps) => {

      if (err) {
        return res.status(500).send(err.message);
      }

      if (redirectLocation) {
        return res.redirect(302, redirectLocation.pathname + redirectLocation.search);
      }

      let markup;
      if (renderProps) {
        markup = renderToString(<RouterContext {...renderProps}/>);
      } else {
        markup = renderToString(<NotFoundPage/>);
        res.status(404);
      }

      return res.render('index', { markup });
    }
  );
});

const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'production';
server.listen(port, err => {
  if (err) {
    return console.error(err);
  }
  console.info(`Server running on http://localhost:${port}`);
});
