'use strict';
const gulp = require('gulp');
const del = require('del');
const shell = require('gulp-shell');
const copy = require('gulp-copy');
const argv = require('yargs').argv;
const webpack = require('webpack-stream');
const path = require('path');
const KarmaServer = require('karma').Server;


gulp.task('buildProject', shell.task('tsc --project tsconfig.json'));

gulp.task('build', gulp.series(clean('./dist/' + argv.project), 'buildProject', copyFiles()));
gulp.task('test', gulp.series(clean('./dist/tests'), buildTestFiles()));

function clean(path) {
    return function clean() {
        return del(path, {force: true});
    };
}

function copyFiles() {
    return function copyFiles() {
        return gulp.src(['README.md', 'package.json'])
            .pipe(copy('./dist/' + argv.project));
    };
}

function buildTestFiles() {
    return function buildTestFiles(done) {
        gulp.src(['./main/src/**/*.spec.ts'])
            .pipe(webpack({
                watch: true,
                mode: 'development',
                output: {
                    filename: '[name].spec.js',
                },
                module: {
                    rules: [
                        {
                            test: /\.ts$/,
                            use: [
                                {
                                    loader: 'ts-loader',
                                    options: {
                                        configFile: path.resolve('tsconfig.spec.json'),
                                    }
                                }
                            ]
                        }
                    ]
                },
                resolve: {
                    modules: [
                        path.resolve(__dirname, 'node_modules'),
                        path.resolve(__dirname, 'main/src')
                    ],
                    extensions: ['.ts']
                }
            }))
            .pipe(gulp.dest(path.resolve(__dirname, 'dist/tests')));

        new KarmaServer({
            configFile: path.resolve(__dirname, 'karma.conf.js'),
            autoWatch: true,
            port: 9876,
        }, done).start();
        done();
    };
}
