// src/app/api/check-user/route.js

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

function addCORS(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization'
  );
  return res;
}

export async function OPTIONS() {
  return addCORS(new NextResponse(null, { status: 204 }));
}

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function parseJson(value) {
  if (value == null) return null;

  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractPhoneValue(value) {
  value = parseJson(value);

  if (value == null) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    const keys = [
      'Value', 'value', 'phone', 'Phone',
      'mobile', 'Mobile', 'number',
      'phoneRaw', 'contact'
    ];

    for (const key of keys) {
      if (value[key] != null) {
        const extracted = extractPhoneValue(value[key]);
        if (extracted) return extracted;
      }
    }

    for (const item of Object.values(value)) {
      const extracted = extractPhoneValue(item);
      if (extracted) return extracted;
    }
  }

  return '';
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const phoneRaw = String(
      body?.phone || body?.mobile || body?.identifier || ''
    ).trim();

    if (!phoneRaw) {
      return addCORS(
        NextResponse.json(
          { ok: false, exists: false, message: 'Phone required' },
          { status: 400 }
        )
      );
    }

    const inputDigits = digitsOnly(phoneRaw);

    if (inputDigits.length < 10) {
      return addCORS(
        NextResponse.json(
          { ok: false, exists: false, message: 'Invalid phone' },
          { status: 400 }
        )
      );
    }

    // Fetch imported member records from MySQL.
    const [rows] = await db.execute(`
      SELECT
        firebase_key,
        record_data,
        phone,
        businessName,
        city,
        email,
        region,
        fullName,
        createdAt,
        updatedAt,
        chapterName,
        memberStatus,
        trafficLight,
        businessCategory,
        notes,
        userProfile
      FROM members
    `);

    let found = null;

    for (const row of rows) {
      const recordData = parseJson(row.record_data);

      const candidates = [
        row.phone,
        recordData?.phone,
        recordData?.mobile,
        recordData?.phoneRaw
      ];

      const matched = candidates.some(candidate => {
        const storedDigits = digitsOnly(
          extractPhoneValue(candidate)
        );

        if (storedDigits.length < 10) return false;

        return (
          storedDigits === inputDigits ||
          storedDigits.slice(-10) === inputDigits.slice(-10)
        );
      });

      if (matched) {
        found = {
          ...row,
          record_data: recordData,
          phone: parseJson(row.phone),
          businessName: parseJson(row.businessName),
          city: parseJson(row.city),
          email: parseJson(row.email),
          region: parseJson(row.region),
          fullName: parseJson(row.fullName),
          createdAt: parseJson(row.createdAt),
          updatedAt: parseJson(row.updatedAt),
          chapterName: parseJson(row.chapterName),
          memberStatus: parseJson(row.memberStatus),
          trafficLight: parseJson(row.trafficLight),
          businessCategory: parseJson(row.businessCategory),
          notes: parseJson(row.notes),
          userProfile: parseJson(row.userProfile)
        };

        break;
      }
    }

    if (!found) {
      return addCORS(
        NextResponse.json({
          ok: true,
          exists: false,
          member: null,
          message: 'No registered member found for this phone number'
        })
      );
    }

    // Existing member found: return their actual imported data.
    return addCORS(
      NextResponse.json({
        ok: true,
        exists: true,
        memberId: found.firebase_key,
        member: found
      })
    );
  } catch (err) {
    console.error('check-user MySQL error:', err);

    return addCORS(
      NextResponse.json(
        {
          ok: false,
          exists: false,
          message: 'Unable to check member'
        },
        { status: 500 }
      )
    );
  }
}