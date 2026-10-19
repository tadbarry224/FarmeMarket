import { escapeLikePattern } from './catalog.service';

describe('escapeLikePattern', () => {
  it('échappe les jokers SQL et le caractère d’échappement', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
    expect(escapeLikePattern('riz_local')).toBe('riz\\_local');
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  it('laisse le texte ordinaire intact', () => {
    expect(escapeLikePattern('Tomates fraîches')).toBe('Tomates fraîches');
  });
});
