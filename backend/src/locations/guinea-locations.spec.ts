import {
  GUINEA_REGIONS,
  isGuineaRegion,
  isPrefectureOfRegion,
} from './guinea-locations';

describe('Découpage administratif de la Guinée', () => {
  it('contient 8 régions et 34 préfectures (33 + Conakry)', () => {
    const prefectures = Object.values(GUINEA_REGIONS).flat();

    expect(Object.keys(GUINEA_REGIONS)).toHaveLength(8);
    expect(prefectures).toHaveLength(34);
    expect(new Set(prefectures).size).toBe(prefectures.length);
  });

  it('reconnaît une région, accents compris', () => {
    expect(isGuineaRegion('Nzérékoré')).toBe(true);
    expect(isGuineaRegion('Nzerekore')).toBe(false);
    // Une propriété héritée d'Object n'est pas une région
    expect(isGuineaRegion('toString')).toBe(false);
  });

  it('vérifie que la préfecture appartient à la région', () => {
    expect(isPrefectureOfRegion('Kindia', 'Coyah')).toBe(true);
    expect(isPrefectureOfRegion('Labé', 'Coyah')).toBe(false);
    expect(isPrefectureOfRegion('Inconnue', 'Coyah')).toBe(false);
    expect(isPrefectureOfRegion('Kindia', undefined)).toBe(false);
  });
});
