'use strict';

var gulp = require('gulp');

var argv = require('yargs').argv;
var fs = require('fs');
var wiredep = require('wiredep').stream;
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var del = require('del');


var options = {
    src: 'src',
    dist: 'dist',
    tmp: '.tmp',
    wiredep: {
        directory: 'bower_components',
        exclude: []
    }
};

gulp.task('default', function () {
    return gulp.src('src/**/*.js')
            .pipe(sourcemaps.init())
            .pipe(babel())
            .pipe(concat('gordium.js'))
            .pipe(sourcemaps.write('.'))
            .pipe(gulp.dest('dist'));
});

gulp.task('clean', function (done) {
    del([options.dist + '/', options.tmp + '/'], done);
});