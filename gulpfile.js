'use strict';
const gulp = require('gulp');
const del = require('del');
const shell = require('gulp-shell');
const copy = require('gulp-copy');
const argv = require('yargs')(process.argv)
    .option('watch', {
        type: 'boolean',
        default: false,
    }).parse();
const webpack = require('webpack-stream');
const path = require('path');
const {Server, config} = require("karma");


gulp.task('buildProject', shell.task('tsc --project tsconfig.json'));

gulp.task('build', gulp.series(clean('./dist/' + argv.project), 'buildProject', copyFiles()));
gulp.task('test', gulp.series(clean('./dist/tests'), buildTestFiles(), runTests()));

function clean(path) {
    return function clean() {
        return del.deleteAsync(path, {force: true});
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
        let countWebpackProceedFiles = 0;
        let countFinishedFiles = 0;
        gulp.src('./main/src/**/*.spec.ts')
            .pipe(webpack({
                watch: JSON.parse(argv.watch),
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
            .on('data', () => {
                countWebpackProceedFiles++;
            })
            .pipe(gulp.dest(path.resolve(__dirname, 'dist/tests')))
            .on('data', () => {
                // This is needed to finish the endless task of monitoring the webpack (when watch is true) to be able run the next task.
                countFinishedFiles++;
                if (countWebpackProceedFiles === countFinishedFiles) {
                    done();
                }
            });
    };
}

function runTests() {
    return async function runTests() {
        const cliOptions = {
            autoWatch: JSON.parse(argv.watch),
            singleRun: !JSON.parse(argv.watch),
            port: 9876
        };

        if (argv.browsers) {
            cliOptions.browsers = [argv.browsers];
        }

        const karmaConfig = await config.parseConfig(
            path.resolve(__dirname, 'karma.conf.js'),
            cliOptions,
            {
                promiseConfig: true,
                throwErrors: true
            }
        );

        const server = new Server(karmaConfig);

        await server.start();
    };
}