'use strict';

var gulp = require('gulp');

var argv = require('yargs').argv;
var fs = require('fs');
var wiredep = require('wiredep').stream;

var options = {
    wiredep: {
        directory: 'bower_components',
        exclude: []
    }
};