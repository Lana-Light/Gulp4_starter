const { watch, src, dest, series, parallel } = require("gulp");
const browserSync = require("browser-sync").create();
const del = require("del");
const imagemin = require("gulp-imagemin");
const advpng = require("imagemin-advpng");
const cache = require("gulp-cache");
const gulpif = require("gulp-if");
const rename = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");
const plumber = require("gulp-plumber");

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

const isDev = process.argv.includes("dev");
console.log(isDev);

function compJs() {
  return src("src/js7/**/*.js")
    .pipe(plumber())
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
    .pipe(plumber())
    .pipe(gulpif(isDev, dest("src/js")))
    .pipe(gulpif(isDev, browserSync.stream()));
}

function compSass() {
  return src("src/scss/all.scss")
    .pipe(plumber())
    .pipe(gulpif(isDev, sourcemaps.init()))
    .pipe(sass().on("error", sass.logError))
    .pipe(gulpif(isDev, sourcemaps.write()))
    .pipe(gulpif(isDev, dest("src/css")))
    .pipe(gulpif(isDev, browserSync.stream()));
}

function minJs() {
  return bundle()
    .pipe(uglify({ ecma: 6 }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(dest("dist/js"));
}

function minCss() {
  return compSass()
    .pipe(mq())
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(rename({ suffix: ".min" }))
    .pipe(dest("dist/css"));
}

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
    .pipe(plumber())
    .pipe(pug())
    .pipe(gulpif(isDev, dest("src")));

const distView = () =>
  compPug()
    .pipe(replace("all.css", "all.min.css"))
    .pipe(replace("all.js", "all.min.js"))
    .pipe(dest("dist"));

async function watchWrap() {
  browserSync.init({ server: "src" });
  watch("src/pug/**", compPug);
  watch("src/scss/**", compSass);
  watch("src/js7/**", series(compJs, bundle));
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

const pathsToDel = [
  "dist/**",
  "!dist",
  "src/js/**",
  "!src/js",
  "src/css/**",
  "!src/css"
];

async function cleanHard() {
  await del(pathsToDel);
  return cache.clearAll();
}

const clean = async () =>
  del(pathsToDel.concat(["!dist/images", "!dist/images/*"]));

exports.build = series(
  clean,
  parallel(font, image, distView, minCss, series(compJs, minJs))
);

exports.dev = series(
  clean,
  parallel(compPug, series(compJs, bundle), compSass),
  watchWrap
);

exports.grid = grid;
exports.clean = cleanHard;
exports.html = distView;
exports.css = minCss;
exports.js = series(compJs, minJs);
exports.img = image;
