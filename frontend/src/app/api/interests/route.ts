import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/test/debug-interests`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ interests: data.interests || [] });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { interests: [], error: 'Failed to fetch interests' },
      { status: 500 }
    );
  }
}