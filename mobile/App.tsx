import React, { useEffect, useState } from "react";
import { SafeAreaView, StatusBar, Text, TextInput, Pressable, View, ScrollView, StyleSheet, Alert } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.10:8000";
type Chat = { id: number; title: string; messages?: { id:number; role:"user"|"assistant"; content:string }[] };

export default function App() {
  const [token,setToken] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [registerMode,setRegisterMode] = useState(false);
  const [chats,setChats] = useState<Chat[]>([]);
  const [activeId,setActiveId] = useState<number|null>(null);
  const [message,setMessage] = useState("");
  const [messages,setMessages] = useState<{role:"user"|"assistant";content:string}[]>([]);
  const [busy,setBusy] = useState(false);

  async function request(path:string, options:RequestInit = {}, auth=true) {
    const headers:Record<string,string> = {"Content-Type":"application/json"};
    if(auth && token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_URL}/api/v1${path}`,{...options,headers});
    if(!response.ok) {
      const data = await response.json().catch(()=>({}));
      throw new Error(data.detail || "Request failed");
    }
    if(response.status===204) return null;
    return response.json();
  }

  async function authenticate() {
    if(!email.trim() || password.length<8) { Alert.alert("Check details","Enter a valid email and password with at least 8 characters."); return; }
    setBusy(true);
    try {
      const data = await request(registerMode?"/auth/register":"/auth/login",{method:"POST",body:JSON.stringify({email,password})},false);
      setToken(data.access_token);
      setPassword("");
    } catch(e) { Alert.alert("Sign-in failed",e instanceof Error?e.message:"Try again"); }
    finally { setBusy(false); }
  }

  useEffect(()=> {
    if(!token) return;
    request("/conversations").then(setChats).catch(e=>Alert.alert("History",e.message));
  },[token]);

  async function openChat(id:number) {
    try {
      const data=await request(`/conversations/${id}`);
      setActiveId(id); setMessages(data.messages||[]);
    } catch(e) { Alert.alert("Could not open chat",e instanceof Error?e.message:"Try again"); }
  }

  async function send() {
    const value=message.trim();
    if(!value||busy) return;
    setBusy(true); setMessage("");
    setMessages(v=>[...v,{role:"user",content:value}]);
    try {
      const data=await request("/chat",{method:"POST",body:JSON.stringify({message:value,language:"auto",conversation_id:activeId})});
      setActiveId(data.conversation_id);
      setMessages(v=>[...v,{role:"assistant",content:data.reply}]);
      setChats(await request("/conversations"));
    } catch(e) { Alert.alert("Message failed",e instanceof Error?e.message:"Try again"); }
    finally { setBusy(false); }
  }

  if(!token) return <SafeAreaView style={s.root}>
    <StatusBar barStyle="light-content"/>
    <Text style={s.brand}>◉ OMNIVARA</Text><Text style={s.tag}>INTELLIGENCE WITHOUT LIMITS</Text>
    <Text style={s.heading}>{registerMode?"Create account":"Welcome back"}</Text>
    <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor="#929cab" style={s.input}/>
    <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password (8+ characters)" placeholderTextColor="#929cab" style={s.input}/>
    <Pressable onPress={authenticate} disabled={busy} style={s.button}><Text style={s.buttonText}>{busy?"Please wait…":registerMode?"Create account":"Log in"}</Text></Pressable>
    <Pressable onPress={()=>setRegisterMode(v=>!v)}><Text style={s.link}>{registerMode?"Already registered? Log in":"New here? Create an account"}</Text></Pressable>
  </SafeAreaView>;

  return <SafeAreaView style={s.root}>
    <StatusBar barStyle="light-content"/>
    <View style={s.header}><Text style={s.brand}>◉ OMNIVARA</Text><Pressable onPress={()=>{setToken("");setMessages([]);setActiveId(null);}}><Text style={s.link}>Log out</Text></Pressable></View>
    <ScrollView horizontal style={{maxHeight:54,flexGrow:0}} contentContainerStyle={{gap:8,alignItems:"center"}}>
      <Pressable style={s.chatChip} onPress={()=>{setActiveId(null);setMessages([]);}}><Text style={s.buttonText}>+ New chat</Text></Pressable>
      {chats.map(c=><Pressable key={c.id} style={s.chatChip} onPress={()=>openChat(c.id)}><Text style={s.buttonText}>{c.title.slice(0,22)}</Text></Pressable>)}
    </ScrollView>
    <ScrollView style={{flex:1}} contentContainerStyle={{paddingVertical:18}}>
      {messages.length===0&&<Text style={s.heading}>How can I help you today?</Text>}
      {messages.map((m,i)=><View key={i} style={s.card}><Text style={s.gold}>{m.role==="assistant"?"OMNIVARA":"YOU"}</Text><Text style={s.reply}>{m.content}</Text></View>)}
      {busy&&<Text style={s.link}>OMNIVARA is thinking…</Text>}
    </ScrollView>
    <View style={s.row}><TextInput value={message} onChangeText={setMessage} placeholder="আপনার প্রশ্ন লিখুন..." placeholderTextColor="#929cab" style={[s.input,{flex:1,marginBottom:0}]}/><Pressable onPress={send} disabled={busy||!message.trim()} style={s.button}><Text style={s.buttonText}>↑</Text></Pressable></View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#0b0e13",padding:18},
 header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 brand:{color:"#f4f2ec",fontWeight:"800",fontSize:23,letterSpacing:2},
 tag:{color:"#d6b66d",fontSize:9,letterSpacing:2,marginTop:8,marginBottom:32},
 heading:{color:"#fff",fontSize:27,fontWeight:"700",marginVertical:20},
 input:{backgroundColor:"#121923",borderColor:"#394555",borderWidth:1,borderRadius:10,padding:14,color:"#fff",marginBottom:12},
 button:{backgroundColor:"#d6b66d",padding:14,borderRadius:10,alignItems:"center",justifyContent:"center"},
 buttonText:{color:"#111",fontWeight:"700"},
 link:{color:"#d6b66d",padding:12},
 row:{flexDirection:"row",gap:8,alignItems:"center"},
 card:{backgroundColor:"#121923",padding:16,borderRadius:14,marginBottom:12},
 gold:{color:"#d6b66d",fontSize:10,letterSpacing:2},
 reply:{color:"#f4f2ec",fontSize:16,lineHeight:24,marginTop:8},
 chatChip:{backgroundColor:"#263342",padding:10,borderRadius:10}
});
