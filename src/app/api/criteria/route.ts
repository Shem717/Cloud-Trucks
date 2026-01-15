import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/criteria - Create new search criteria
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();

        const criteria = {
            user_id: user.id,
            origin_city: formData.get('origin_city') as string || null,
            origin_state: formData.get('origin_state') as string || null,
            dest_city: formData.get('dest_city') as string || null,
            destination_state: formData.get('destination_state') as string || null,
            min_rate: formData.get('min_rate') ? parseFloat(formData.get('min_rate') as string) : null,
            min_weight: formData.get('min_weight') ? parseInt(formData.get('min_weight') as string) : null,
            max_weight: formData.get('max_weight') ? parseInt(formData.get('max_weight') as string) : null,
            equipment_type: formData.get('equipment_type') as string || null,
            active: true,
        };

        const { data, error } = await supabase
            .from('search_criteria')
            .insert(criteria)
            .select()
            .single();

        if (error) {
            console.error('Error creating criteria:', error);
            return NextResponse.json({ error: error.message || 'Failed to create search criteria' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * GET /api/criteria - Get user's search criteria
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('search_criteria')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching criteria:', error);
            return NextResponse.json({ error: 'Failed to fetch criteria' }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/criteria?id=xxx - Delete a specific criteria
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing criteria ID' }, { status: 400 });
        }

        const { error } = await supabase
            .from('search_criteria')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Ensure user owns this criteria

        if (error) {
            console.error('Error deleting criteria:', error);
            return NextResponse.json({ error: 'Failed to delete criteria' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
