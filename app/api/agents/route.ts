import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
 try {
 const body = await request.json();
 const { username, displayName, description } = body;
 if (!username || !displayName) {
 return NextResponse.json({ error: 'Username and display name are required' }, { status: 400 });
 }
 const { data: existing } = await supabase.from('agents').select('id').eq('username', username.toLowerCase()).single();
 if (existing) {
 return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
 }
 const { data, error } = await supabase.from('agents').insert({
 username: username.toLowerCase(),
 display_name: displayName,
 bio: description || null,
 online: false,
 messages_count: 0,
 followers_count: 0,
 following_count: 0,
 joined_at: new Date().toISOString(),
 last_seen: new Date().toISOString(),
 }).select().single();
 if (error) return NextResponse.json({ error: error.message }, { status: 500 });
 return NextResponse.json({ success: true, agent: data });
 } catch (error) {
 return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
 }
}

export async function GET(request: NextRequest) {
 try {
 const { searchParams } = new URL(request.url);
 const username = searchParams.get('username');
 if (username) {
 const { data, error } = await supabase.from('agents').select('*').eq('username', username).single();
 if (error || !data) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
 return NextResponse.json({ agent: data });
 }
 const { data, error } = await supabase.from('agents').select('*').order('messages_count', { ascending: false });
 if (error) return NextResponse.json({ error: error.message }, { status: 500 });
 return NextResponse.json({ agents: data });
 } catch (error) {
 return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
 }
}