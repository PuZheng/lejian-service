var nodemon = require('gulp-nodemon');
var gulp = require('gulp');

gulp.task('serve-dev', function() {
    var options = {
        script: './index.js',
        execMap: {
            "js": "node"
        },
        delayTime: 1,
        watch: ['./']
    };

    return nodemon(options);
});

gulp.task('default', ['serve-dev']);
