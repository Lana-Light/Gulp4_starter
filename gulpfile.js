var { watch, src, dest, series, parallel } = require('gulp');
var browserSync = require('browser-sync').create();
var del = require('del');
var imagemin = require('gulp-imagemin');
var advpng = require('imagemin-advpng');
var cache = require('gulp-cache');
var gulpif = require('gulp-if');
var rename = require('gulp-rename');

var pug = require('gulp-pug');
var replace = require('gulp-replace');
var sass = require('gulp-sass');
var cssnano = require('gulp-cssnano');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify-es').default;
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var b3 = browserify({ entries: ['./src/js/all.js'] });

function compJs() {
    return src('src/js7/**')
        .pipe(babel())
        .pipe(dest('src/js'));
}

function bundle() {
    return b3.bundle()
        .pipe(source('all.js'))
        .pipe(buffer())
        .pipe(dest('src/js'));
}

function compSass() {
    return src('src/scss/all.scss')
        .pipe(sass())
        .pipe(dest('src/css'));
}

var min = doFun => () => doFun()
    .pipe(gulpif('*.css', cssnano(), uglify({ ecma: 6 })))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulpif('*.css', dest('dist/css'), dest('dist/js')));

var brSync = async () => browserSync.init({ server: 'src' });
var bsStream = doFun => () => doFun().pipe(browserSync.stream());

var compPug = () => src('src/pug/index.pug')
    .pipe(pug())
    .pipe(dest('src'));

var distView = () => compPug()
    .pipe(replace('all.css', 'all.min.css'))
    .pipe(replace('all.js', 'all.min.js'))
    .pipe(dest('dist'));

async function watchWrap() {
    watch('src/pug/**', compPug);
    watch('src/scss/**', bsStream(min(compSass)));
    watch('src/js7/**', series(compJs, bsStream(min(bundle))));
    watch('src/*.html').on('change', browserSync.reload);
}

function font() {
    return src('src/fonts/**')
        .pipe(dest('dist/fonts'));
}

function image() {
    return src('src/images/*.+(jpg|jpeg|png|gif|svg)')
        .pipe(cache(imagemin([
            imagemin.gifsicle({ interlaced: true }),
            imagemin.jpegtran({ progressive: true }),
            advpng(),
            imagemin.svgo({
                plugins: [
                       { removeViewBox: true },
                       { cleanupIDs: false }
                ]
            })
        ], { verbose: true }
        )))
        .pipe(dest('dist/images'));
}

async function clean() {
    await del(['dist/**', '!dist', 'src/js/**', '!src/js', 'src/css/**', '!src/css']);
    return cache.clearAll();
}

var cleanDist = async () => del(['dist/**', '!dist', '!dist/images', '!dist/images/*']);


exports.build = series(cleanDist, parallel(font, image, distView, min(compSass), series(compJs, min(bundle))));
exports.dev = series(cleanDist, brSync, parallel(compPug, series(compJs, bsStream(bundle)), bsStream(compSass), watchWrap));
exports.clean = clean;
