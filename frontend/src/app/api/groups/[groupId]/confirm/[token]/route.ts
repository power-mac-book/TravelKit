import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string; token: string } }
) {
  try {
    const { groupId, token } = params;

    const response = await fetch(
      `${API_BASE_URL}/api/v1/groups/${groupId}/confirm/${token}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch confirmation data' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch confirmation data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching group confirmation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; token: string } }
) {
  try {
    const { groupId, token } = params;
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/api/v1/groups/${groupId}/confirm/${token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to process confirmation' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to process confirmation' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error processing group confirmation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}