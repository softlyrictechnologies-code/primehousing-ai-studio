import { describe, expect, it } from 'vitest';
import {
  filterAndSortProperties,
  matchesPropertyCategory,
  parseNumericFilter,
} from '../src/services/propertyService.js';
import type { Property } from '../src/types/realEstate';

const SAMPLE_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    propertyRef: 'PH101',
    title: 'Green Valley Residential Plot',
    propertyType: 'Residential Plot',
    description: 'DTCP approved residential corner plot near bypass.',
    location: 'Madurai',
    district: 'Madurai',
    town: 'Thirumangalam',
    village: 'Kappalur',
    fullAddress: 'Kappalur, Thirumangalam, Madurai',
    area: 1200,
    areaUnit: 'Sq. Ft.',
    price: 1500000,
    roadAccess: '30 ft Tar Road',
    approvalDetails: 'DTCP Approved',
    features: ['Corner Plot', 'Gated Entry'],
    images: ['https://example.com/1.jpg'],
    isFeatured: true,
    status: 'published',
    verified: true,
    createdAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-01-12T10:00:00.000Z',
  },
  {
    id: 'prop-2',
    propertyRef: 'PH102',
    title: 'Nilgiri Heritage Estate Plot',
    propertyType: 'Estate Land',
    description: 'Scenic hill estate suitable for holiday villa.',
    location: 'Ooty',
    district: 'Nilgiris',
    town: 'Coonoor',
    village: '',
    fullAddress: 'Coonoor Road, Ooty',
    area: 0,
    areaUnit: 'Acres',
    price: 0,
    roadAccess: '20 ft Concrete Road',
    approvalDetails: 'Verified Title',
    features: ['Hill View'],
    images: ['https://example.com/2.jpg'],
    isFeatured: false,
    status: 'published',
    verified: true,
    createdAt: '2026-02-15T10:00:00.000Z',
    updatedAt: '2026-02-15T10:00:00.000Z',
  },
  {
    id: 'prop-3',
    propertyRef: 'PH103',
    title: 'Pollachi Coconut Farm Parcel',
    propertyType: 'Agricultural Land',
    description: 'Fertile farmland with borewell and drip irrigation.',
    location: 'Coimbatore',
    district: 'Coimbatore',
    town: 'Pollachi',
    village: 'Zamin Uthukuli',
    fullAddress: 'Pollachi, Coimbatore',
    area: 4800,
    areaUnit: 'Sq. Ft.',
    price: 4200000,
    roadAccess: '24 ft Panchayat Road',
    approvalDetails: 'Registered Patta',
    features: ['Borewell', 'Fencing'],
    images: ['https://example.com/3.jpg'],
    isFeatured: false,
    status: 'sold',
    verified: true,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-05T10:00:00.000Z',
  },
  {
    id: 'prop-4',
    propertyRef: 'PH104',
    title: 'ECR Coastal Commercial Corner',
    propertyType: 'Commercial Land',
    description: 'Prime highway commercial frontage.',
    location: 'Chennai',
    district: 'Chengalpattu',
    town: 'Mahabalipuram',
    village: '',
    fullAddress: 'East Coast Road, Chennai',
    area: 2400,
    areaUnit: 'Sq. Ft.',
    price: 8500000,
    roadAccess: '60 ft Highway',
    approvalDetails: 'CMDA Approved',
    features: ['Highway Frontage'],
    images: ['https://example.com/4.jpg'],
    isFeatured: true,
    status: 'published',
    verified: true,
    createdAt: '2026-03-20T10:00:00.000Z',
    updatedAt: '2026-03-20T10:00:00.000Z',
  },
];

describe('parseNumericFilter', () => {
  it('returns undefined for empty strings, null, undefined, booleans, and invalid values', () => {
    expect(parseNumericFilter('')).toBeUndefined();
    expect(parseNumericFilter('   ')).toBeUndefined();
    expect(parseNumericFilter(null)).toBeUndefined();
    expect(parseNumericFilter(undefined)).toBeUndefined();
    expect(parseNumericFilter(false)).toBeUndefined();
    expect(parseNumericFilter(true)).toBeUndefined();
    expect(parseNumericFilter('abc')).toBeUndefined();
    expect(parseNumericFilter(Number.NaN)).toBeUndefined();
    expect(parseNumericFilter(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it('preserves zero and negative finite numbers cleanly', () => {
    expect(parseNumericFilter(0)).toBe(0);
    expect(parseNumericFilter('0')).toBe(0);
    expect(parseNumericFilter(-500)).toBe(-500);
    expect(parseNumericFilter(' -250.5 ')).toBe(-250.5);
    expect(parseNumericFilter('1500000')).toBe(1500000);
  });
});

describe('matchesPropertyCategory', () => {
  it('matches all, exact, substring, and semantic category groups', () => {
    expect(matchesPropertyCategory('Residential Plot', 'all')).toBe(true);
    expect(matchesPropertyCategory('Residential Plot', 'Residential')).toBe(true);
    expect(matchesPropertyCategory('Luxury Villa', 'Residential')).toBe(true);
    expect(matchesPropertyCategory('Agricultural Land', 'Farm Land')).toBe(true);
    expect(matchesPropertyCategory('Commercial Land', 'Residential')).toBe(false);
    expect(matchesPropertyCategory('', 'Residential')).toBe(false);
  });
});

describe('filterAndSortProperties', () => {
  it('handles price and area boundary filters including zero and min > max', () => {
    const zeroMin = filterAndSortProperties(SAMPLE_PROPERTIES, {
      minPrice: 0,
      maxPrice: 2000000,
    });
    expect(zeroMin.items.map((p) => p.id)).toEqual(['prop-2', 'prop-1']);

    const emptyStringsIgnored = filterAndSortProperties(SAMPLE_PROPERTIES, {
      minPrice: '' as unknown as number,
      maxPrice: '' as unknown as number,
      minArea: '' as unknown as number,
      maxArea: '' as unknown as number,
    });
    expect(emptyStringsIgnored.total).toBe(4);

    const invertedRange = filterAndSortProperties(SAMPLE_PROPERTIES, {
      minPrice: 5000000,
      maxPrice: 1000000,
    });
    expect(invertedRange.total).toBe(0);
    expect(invertedRange.items).toEqual([]);
    expect(invertedRange.totalPages).toBe(1);
    expect(invertedRange.page).toBe(1);

    const negativeFilter = filterAndSortProperties(SAMPLE_PROPERTIES, {
      minPrice: -100,
      maxPrice: -1,
    });
    expect(negativeFilter.total).toBe(0);
  });

  it('filters by availability, location, category, area, and keyword search', () => {
    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { availability: 'published' }).items.map(
        (p) => p.id
      )
    ).toEqual(['prop-4', 'prop-2', 'prop-1']);

    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { availability: 'sold' }).items.map((p) => p.id)
    ).toEqual(['prop-3']);

    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { location: 'Thirumangalam' }).items.map(
        (p) => p.id
      )
    ).toEqual(['prop-1']);

    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, {
        minArea: 1000,
        maxArea: 3000,
      }).items.map((p) => p.id)
    ).toEqual(['prop-4', 'prop-1']);

    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { search: 'borewell' }).items.map((p) => p.id)
    ).toEqual(['prop-3']);
  });

  it('sorts across all supported sort modes and clamps pagination boundaries', () => {
    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { sortBy: 'price_asc' }).items.map((p) => p.id)
    ).toEqual(['prop-2', 'prop-1', 'prop-3', 'prop-4']);

    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { sortBy: 'price_desc' }).items.map((p) => p.id)
    ).toEqual(['prop-4', 'prop-3', 'prop-1', 'prop-2']);

    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { sortBy: 'area_asc' }).items.map((p) => p.id)
    ).toEqual(['prop-2', 'prop-1', 'prop-4', 'prop-3']);

    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { sortBy: 'area_desc' }).items.map((p) => p.id)
    ).toEqual(['prop-3', 'prop-4', 'prop-1', 'prop-2']);

    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { sortBy: 'oldest' }).items.map((p) => p.id)
    ).toEqual(['prop-1', 'prop-2', 'prop-3', 'prop-4']);

    expect(
      filterAndSortProperties(SAMPLE_PROPERTIES, { sortBy: 'featured' }).items.map((p) => p.id)
    ).toEqual(['prop-4', 'prop-1', 'prop-3', 'prop-2']);

    const outOfRangePage = filterAndSortProperties(SAMPLE_PROPERTIES, {
      page: 99,
      pageSize: 2,
    });
    expect(outOfRangePage.page).toBe(2);
    expect(outOfRangePage.totalPages).toBe(2);
    expect(outOfRangePage.items.length).toBe(2);

    const zeroPage = filterAndSortProperties(SAMPLE_PROPERTIES, {
      page: 0,
      pageSize: 2,
    });
    expect(zeroPage.page).toBe(1);
    expect(zeroPage.items.length).toBe(2);
  });
});
