import { UriTemplate } from './uri-template';

describe('UriTemplate', () => {

    it('Basic substitution', () => {
        const template = new UriTemplate('/prefix/{var}/suffix');
        const uri = template.fillFromObject({var: 'test'});

        expect(uri).toBe('/prefix/test/suffix');
    });

    it('Guessing variable priority', () => {
        const template = new UriTemplate('{+path}/c/capture{/date,id,page}');
        const guess = template.fromUri('/a/b/c/capture/20140101/1');

        expect(guess.date).toBe( '20140101');
        expect(guess.id).toBe('1');
        expect(guess.page).toBe(undefined);
    });

    it('Original string available', () => {
        const template = new UriTemplate('{+path}/c/capture{/date,id,page}');


        expect(template.template).toBe('{+path}/c/capture{/date,id,page}');
        expect(template + '').toBe('{+path}/c/capture{/date,id,page}');
    });

    it('Query optional when decoding', () => {
        const template = new UriTemplate('{/type,ids,field}{?query*}');

        const uri = '/user/1,2,3/posts';
        const  guess = template.fromUri(uri);
        expect(guess).toBeInstanceOf(Object);

        const trimmed = template.fill(guess).replace(/\?$/, '');
        expect(trimmed).toBe(uri);
    });

    it('Must return a empty object', () => {
        const template = new UriTemplate('{?query}');

        const uri = '?';
        const guess = template.fromUri(uri);

        expect(guess['']).toBeUndefined();
    });

    it('Must return a empty object in property', () => {
        const template = new UriTemplate('{?query*}');

        const uri = '?';
        const guess = template.fromUri(uri);

        expect(guess['']).toBeUndefined();
    });

});

createTests('Spec examples by section', import('../../test/spec-examples-by-section.json'));
createTests('Extended examples', import('../../test/extended-tests.json'));
createTests('Custom examples 1', import('../../test/custom-tests.json'));
createTests('Custom examples 2', import('../../test/custom-tests-2.json'));

function createTests(title, importedFile) {
    importedFile.then((examplesDoc) => {
        describe(title + '(substitution)', () => {
            for (let sectionTitle in examplesDoc) {
                let exampleSet = examplesDoc[sectionTitle];
                describe(sectionTitle, function () {
                    let variables = exampleSet.variables;
                    let variableFunction = function (varName) {
                        return variables[varName];
                    };

                    for (let i = 0; i < exampleSet?.testcases?.length; i++) {
                        let pair = exampleSet.testcases[i];

                        (function (templateString, expected) {
                            it(templateString, () => {
                                let template = new UriTemplate(templateString);
                                let actualUri = template.fillFromObject(variables);
                                if (typeof expected == 'string') {
                                    expect(actualUri).toEqual(expected);
                                } else {
                                    expect(expected).toContain(actualUri);
                                }
                            });
                        })(pair[0], pair[1]);
                    }
                });
            }
        });

        let unguessable = {};

        describe(title + ' (de-substitution)', () => {
            for (let sectionTitle in examplesDoc) {
                let exampleSet = examplesDoc[sectionTitle];
                describe(sectionTitle, function () {
                    for (let i = 0; i < exampleSet?.testcases?.length; i++) {
                        let pair = exampleSet.testcases[i];

                        (function (templateString, expected, exampleSet) {
                            if (unguessable[templateString]) {
                                return;
                            }

                            it(templateString, () => {
                                let original = (typeof expected == 'string') ? expected : expected[0];
                                let template = new UriTemplate(templateString);

                                let guessedVariables = template.fromUri(original);
                                expect(guessedVariables).toBeInstanceOf(Object);

                                let reconstructed = template.fillFromObject(guessedVariables);

                                if (typeof expected == 'string') {
                                    expect(reconstructed).toEqual(expected);
                                } else {
                                    expect(expected).toContain(reconstructed);
                                }
                            });
                        })(pair[0], pair[1], exampleSet);
                    }
                });
            }
        });
    });

}
