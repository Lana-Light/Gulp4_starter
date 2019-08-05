const { watch, src, dest, series, parallel } = require("gulp");
const browserSync = require("browser-sync").create();
const del = require("del");
const imagemin = require("gulp-imagemin");
const advpng = require("imagemin-advpng");
const cache = require("gulp-cache");
const gulpif = require("gulp-if");
const rename = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");

const pug = require("gulp-pug");
const replace = require("gulp-replace");
const smartgrid = require("smart-grid");
const sass = require("gulp-sass");
const mq = require("gulp-group-css-media-queries");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

const babel = require("gulp-babel");
const uglify = require("gulp-uglify-es").default;
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");
const browserify = require("browserify")({
  entries: ["./src/js/all.js"],
  debug: true
});

const isDev = process.argv.includes("dev") || process.argv.includes("js");
console.log(isDev);

function compJs() {
  return src("src/js7/**/*.js")
    .pipe(gulpif(isDev, sourcemaps.init()))
    .pipe(babel())
    .pipe(gulpif(isDev, sourcemaps.write()))
    .pipe(dest("src/js"));
}

function bundle() {
  return browserify
    .bundle()
    .pipe(source("all.js"))
    .pipe(buffer())
    .pipe(dest("src/js"));
}

function compSass() {
  return src("src/scss/all.scss")
    .pipe(gulpif(isDev, sourcemaps.init()))
    .pipe(sass())
    .pipe(sourcemaps.write())
    .pipe(dest("src/css"));
}

function min(doFun) {
  return (
    doFun()
      .pipe(gulpif(isDev, browserSync.stream()))
      //.pipe(gulpif(isDev, sourcemaps.init({ loadMaps: true })))
      .pipe(gulpif("*.css", mq()))
      .pipe(gulpif("*.css", postcss([autoprefixer(), cssnano()])))
      .pipe(gulpif("*.js", uglify({ ecma: 6 })))
      .pipe(rename({ suffix: ".min" }))
      //.pipe(gulpif(isDev, sourcemaps.write()))
      .pipe(gulpif("*.css", dest("dist/css")))
      .pipe(gulpif("*.js", dest("dist/js")))
  );
}
const minJs = () => min(bundle);
const minCss = () => min(compSass);

async function grid() {
  let settings = {
    outputStyle: "scss",
    columns: 12,
    offset: "30px",
    //mobileFirst: true,
    container: {
      maxWidth: "1200px",
      fields: "30px"
    },
    breakPoints: {
      lg: {
        width: "1100px"
      },
      md: {
        width: "960px",
        fields: "15px"
      },
      sm: {
        width: "780px"
      },
      xs: {
        width: "560px"
      },
      xxs: {
        width: "420px"
      }
    }
  };

  smartgrid("./src/scss", settings);
}

const compPug = () =>
  src("src/pug/index.pug")
    .pipe(pug())
    .pipe(dest("src"));

const distView = () =>
  compPug()
    .pipe(replace("all.css", "all.min.css"))
    .pipe(replace("all.js", "all.min.js"))
    .pipe(dest("dist"));

async function watchWrap() {
  browserSync.init({ server: "src" });
  watch("src/pug/**", distView);
  watch("src/scss/**", minCss);
  watch("src/js7/**", series(compJs, minJs));
  watch("src/*.html").on("change", browserSync.reload);
}

function font() {
  return src("src/fonts/**").pipe(dest("dist/fonts"));
}

function image() {
  return src("src/images/*.+(jpg|jpeg|png|gif|svg)")
    .pipe(
      cache(
        imagemin(
          [
            imagemin.gifsicle({ interlaced: true }),
            imagemin.jpegtran({ progressive: true }),
            advpng(),
            imagemin.svgo({
              plugins: [{ removeViewBox: true }, { cleanupIDs: false }]
            })
          ],
          { verbose: true }
        )
      )
    )
    .pipe(dest("dist/images"));
}

async function clean() {
  await del([
    "dist/**",
    "!dist",
    "src/js/**",
    "!src/js",
    "src/css/**",
    "!src/css"
  ]);
  return cache.clearAll();
}

var cleanDist = async () =>
  del(["dist/**", "!dist", "!dist/images", "!dist/images/*"]);

exports.build = series(
  cleanDist,
  parallel(font, image, distView, minCss, series(compJs, minJs))
);

exports.dev = series(
  cleanDist,
  parallel(distView, series(compJs, minJs), minCss),
  watchWrap
);

exports.grid = grid;
exports.clean = clean;
