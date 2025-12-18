import { UriTemplate } from './uri-template';

import specExamples from '../../test/spec-examples-by-section.json';
import extendedExamples from '../../test/extended-tests.json';
import customExamples1 from '../../test/custom-tests.json';
import customExamples2 from '../../test/custom-tests-2.json';

describe('UriTemplate', () => {

    it('Basic substitution', () => {
        const template = new UriTemplate('/prefix/{var}/suffix');
        const uri = template.fillFromObject({ var: 'test' });

        expect(uri).toBe('/prefix/test/suffix');
    });

    it('Guessing variable priority', () => {
        const template = new UriTemplate('{+path}/c/capture{/date,id,page}');
        const guess = template.fromUri('/a/b/c/capture/20140101/1');

        expect(guess.date).toBe('20140101');
        expect(guess.id).toBe('1');
        expect(guess.page).toBeUndefined();
    });

    it('Original string available', () => {
        const template = new UriTemplate('{+path}/c/capture{/date,id,page}');

        expect(template.template).toBe('{+path}/c/capture{/date,id,page}');
        expect(String(template)).toBe('{+path}/c/capture{/date,id,page}');
    });

    it('Query optional when decoding', () => {
        const template = new UriTemplate('{/type,ids,field}{?query*}');
        const uri = '/user/1,2,3/posts';

        const guess = template.fromUri(uri);
        const rebuilt = template.fill(guess).replace(/\?$/, '');

        expect(rebuilt).toBe(uri);
    });

    it('Must return an empty object', () => {
        const template = new UriTemplate('{?query}');
        const guess = template.fromUri('?');

        expect(guess['']).toBeUndefined();
    });

    it('Must return an empty object in property', () => {
        const template = new UriTemplate('{?query*}');
        const guess = template.fromUri('?');

        expect(guess['']).toBeUndefined();
    });
});

createTests('Spec examples by section', specExamples);
createTests('Extended examples', extendedExamples);
createTests('Custom examples 1', customExamples1);
createTests('Custom examples 2', customExamples2);

function createTests(title: string, examplesDoc: any) {

    describe(`${title} (substitution)`, () => {

        Object.entries(examplesDoc).forEach(([sectionTitle, exampleSet]: any) => {

            describe(sectionTitle, () => {

                const variables = exampleSet.variables ?? {};

                (exampleSet.testcases ?? []).forEach(([templateString, expected]: any) => {

                    it(templateString, () => {
                        const template = new UriTemplate(templateString);
                        const actual = template.fillFromObject(variables);

                        if (typeof expected === 'string') {
                            expect(actual).toEqual(expected);
                        } else {
                            expect(expected).toContain(actual);
                        }
                    });

                });
            });
        });
    });

    describe(`${title} (de-substitution)`, () => {

        const unguessable: Record<string, boolean> = {};

        Object.entries(examplesDoc).forEach(([sectionTitle, exampleSet]: any) => {

            describe(sectionTitle, () => {

                (exampleSet.testcases ?? []).forEach(([templateString, expected]: any) => {

                    if (unguessable[templateString]) {
                        return;
                    }

                    it(templateString, () => {
                        const original = typeof expected === 'string'
                            ? expected
                            : expected[0];

                        const template = new UriTemplate(templateString);
                        const guessed = template.fromUri(original);

                        expect(guessed).toBeInstanceOf(Object);

                        const reconstructed = template.fillFromObject(guessed);

                        if (typeof expected === 'string') {
                            expect(reconstructed).toEqual(expected);
                        } else {
                            expect(expected).toContain(reconstructed);
                        }
                    });

                });
            });
        });
    });
}
