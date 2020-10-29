import { UriTemplate } from './uri-template';

describe('UriTemplate', () => {
    it('"Guessing variable priority"', () => {
        const template = new UriTemplate("{+path}/c/capture{/date,id,page}");
        const guess = template.fromUri('/a/b/c/capture/20140101/1');

        expect(guess.date).toBe( '20140101');
    });
})
