import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/test/check-groups`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ groups: data.groups || [] });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { groups: [], error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}