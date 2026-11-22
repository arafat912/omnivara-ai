'use client';

import { FormEvent, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
type User = { id: number; email: string };
type ChatMessage = { id?: number; role: 'user' | 'assistant'; content: string; provider?: string };
type Conversation = { id: number; title: string; messages: ChatMessage[] };

export default function Home() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerMode, setRegisterMode] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function api(path: string, options: RequestInit = {}, auth = true) {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (auth && token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || 'Request failed');
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async function loadProfile(accessToken: string) {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error('Session expired');
    const profile = await response.json();
    setUser(profile);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem('omnivara_token');
    if (saved) {
      setToken(saved);
      fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${saved}` } })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(setUser)
        .catch(() => window.localStorage.removeItem('omnivara_token'));
    }
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    api('/conversations').then((items: Conversation[]) => {
      setConversations(items);
      if (items.length && activeId === null) openConversation(items[0].id);
    }).catch(e => setError(e.message));
  }, [token, user]);

  async function authenticate(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const data = await api(registerMode ? '/auth/register' : '/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }, false);
      setToken(data.access_token);
      window.localStorage.setItem('omnivara_token', data.access_token);
      setUser(data.user);
      setPassword('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Authentication failed'); }
    finally { setBusy(false); }
  }

  async function openConversation(id: number) {
    try {
      const item = await api(`/conversations/${id}`);
      setActiveId(id); setMessages(item.messages || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load conversation'); }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setMessages(v => [...v, { role: 'user', content: message }]);
    setInput(''); setBusy(true); setError('');
    try {
      const data = await api('/chat', {
        method: 'POST',
        body: JSON.stringify({ message, language: 'auto', conversation_id: activeId }),
      });
      setActiveId(data.conversation_id);
      setMessages(v => [...v, { role: 'assistant', content: data.reply, provider: data.provider }]);
      const items = await api('/conversations');
      setConversations(items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Message failed'); }
    finally { setBusy(false); }
  }

  async function newChat() { setActiveId(null); setMessages([]); setError(''); }
  function logout() {
    window.localStorage.removeItem('omnivara_token');
    setToken(''); setUser(null); setConversations([]); setMessages([]); setActiveId(null);
  }

  if (!user) return (
    <main style={{maxWidth:440,margin:'10vh auto',padding:24,fontFamily:'Arial',color:'#f4f2ec',background:'#121923',borderRadius:18}}>
      <h1>◉ OMNIVARA</h1><p>INTELLIGENCE WITHOUT LIMITS</p>
      <h2>{registerMode ? 'Create your account' : 'Welcome back'}</h2>
      <form onSubmit={authenticate} style={{display:'grid',gap:12}}>
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" style={{padding:13}} />
        <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (at least 8 characters)" style={{padding:13}} />
        <button disabled={busy} style={{padding:13}}>{busy ? 'Please wait…' : registerMode ? 'Create account' : 'Log in'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p>{registerMode ? 'Already registered?' : 'New to OMNIVARA?'} <button onClick={()=>{setRegisterMode(!registerMode);setError('');}}>{registerMode ? 'Log in' : 'Create account'}</button></p>
      <small>Use a unique password. Your account data is stored by this application.</small>
    </main>
  );

  return (
    <main style={{display:'grid',gridTemplateColumns:'260px 1fr',minHeight:'100vh',background:'#0b0e13',color:'#f4f2ec',fontFamily:'Arial'}}>
      <aside style={{padding:18,background:'#121923',borderRight:'1px solid #303b49'}}>
        <h2>◉ OMNIVARA</h2><button onClick={newChat} style={{width:'100%',padding:12}}>+ New chat</button>
        <h4>CHAT HISTORY</h4>
        {conversations.map(c=><button key={c.id} onClick={()=>openConversation(c.id)} style={{display:'block',width:'100%',textAlign:'left',marginBottom:6,background:activeId===c.id?'#d6b66d':'#202a36',color:activeId===c.id?'#111':'#fff'}}>{c.title}</button>)}
        <div style={{position:'absolute',bottom:18}}><small>{user.email}</small><br/><button onClick={logout}>Log out</button></div>
      </aside>
      <section style={{maxWidth:900,width:'100%',margin:'0 auto',padding:24,display:'flex',flexDirection:'column',minHeight:'100vh'}}>
        <header><h1>OMNIVARA</h1><p>Intelligence Without Limits</p></header>
        <div style={{flex:1,padding:'20px 0'}}>
          {messages.length===0 && <h2>How can I help you today?</h2>}
          {messages.map((m,i)=><article key={m.id ?? i} style={{padding:14,marginBottom:12,background:'#121923',borderRadius:12}}><b>{m.role==='assistant'?'OMNIVARA':'YOU'}</b><p style={{whiteSpace:'pre-wrap'}}>{m.content}</p></article>)}
          {busy && <p>OMNIVARA is thinking…</p>}
        </div>
        {error && <p role="alert">{error}</p>}
        <form onSubmit={sendMessage} style={{display:'flex',gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask OMNIVARA..." style={{flex:1,padding:15}} />
          <button disabled={busy||!input.trim()} style={{padding:15}}>Send</button>
        </form>
        <small>AI can make mistakes. Verify important information.</small>
      </section>
    </main>
  );
}
