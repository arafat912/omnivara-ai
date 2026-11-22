import React, { useEffect, useState } from "react";
import {
  SafeAreaView, StatusBar, Text, TextInput, Pressable, View,
  ScrollView, StyleSheet, Alert, ActivityIndicator
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Speech from "expo-speech";
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from "@react-native-voice/voice";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8000").replace(/\/$/, "");
type Chat = { id: number; title: string; messages?: { id:number; role:"user"|"assistant"; content:string }[] };
type ChatMessage = { role:"user"|"assistant"; content:string };

export default function App() {
  const [token,setToken] = useState("");
  const [restoring,setRestoring] = useState(true);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [registerMode,setRegisterMode] = useState(false);
  const [chats,setChats] = useState<Chat[]>([]);
  const [activeId,setActiveId] = useState<number|null>(null);
  const [message,setMessage] = useState("");
  const [messages,setMessages] = useState<ChatMessage[]>([]);
  const [busy,setBusy] = useState(false);
  const [listening,setListening] = useState(false);

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

  useEffect(() => {
    Voice.onSpeechResults = (event:SpeechResultsEvent) => {
      const transcript = event.value?.[0];
      if(transcript) setMessage(current => current ? `${current} ${transcript}` : transcript);
      setListening(false);
    };
    Voice.onSpeechError = (_event:SpeechErrorEvent) => {
      setListening(false);
      Alert.alert("Voice input", "কথা বুঝতে সমস্যা হয়েছে। আবার চেষ্টা করুন এবং Microphone permission চালু রাখুন।");
    };
    return () => {
      Speech.stop();
      Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => undefined);
    };
  }, []);

  async function startVoiceInput() {
    if(listening) {
      try { await Voice.stop(); } catch {}
      setListening(false);
      return;
    }
    try {
      await Voice.start("bn-BD");
      setListening(true);
    } catch {
      setListening(false);
      Alert.alert("Voice unavailable", "এই Android build-এ voice recognition চালু করা যায়নি। Microphone permission দিন এবং অ্যাপটি পুনরায় build করুন।");
    }
  }

  function speakReply(text:string) {
    Speech.stop();
    Speech.speak(text, { language:"bn-BD", rate:0.92, onError:() => Alert.alert("Audio", "এই ডিভাইসে বাংলা voice পাওয়া যায়নি।") });
  }

  useEffect(() => {
    SecureStore.getItemAsync("omnivara_access_token")
      .then(saved => { if (saved) setToken(saved); })
      .catch(() => Alert.alert("Session", "Could not restore the saved session. Please log in again."))
      .finally(() => setRestoring(false));
  }, []);

  useEffect(()=> {
    if(!token) return;
    request("/conversations")
      .then(setChats)
      .catch(e=>Alert.alert("History",e.message));
  },[token]);

  async function authenticate() {
    if(!email.trim() || password.length<8) {
      Alert.alert("Check details","Enter a valid email and password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const data = await request(registerMode?"/auth/register":"/auth/login",{
        method:"POST",body:JSON.stringify({email,password})
      },false);
      await SecureStore.setItemAsync("omnivara_access_token",data.access_token);
      setToken(data.access_token);
      setPassword("");
    } catch(e) {
      Alert.alert("Sign-in failed",e instanceof Error?e.message:"Try again");
    } finally { setBusy(false); }
  }

  async function openChat(id:number) {
    try {
      const data=await request(`/conversations/${id}`);
      setActiveId(id);
      setMessages(data.messages||[]);
    } catch(e) {
      Alert.alert("Could not open chat",e instanceof Error?e.message:"Try again");
    }
  }

  async function logout() {
    await SecureStore.deleteItemAsync("omnivara_access_token");
    setToken("");
    setChats([]);
    setMessages([]);
    setActiveId(null);
  }

  async function send() {
    const value=message.trim();
    if(!value||busy) return;
    setBusy(true);
    setMessage("");
    setMessages(v=>[...v,{role:"user",content:value}]);
    try {
      const data=await request("/chat",{
        method:"POST",
        body:JSON.stringify({message:value,language:"auto",conversation_id:activeId})
      });
      setActiveId(data.conversation_id);
      setMessages(v=>[...v,{role:"assistant",content:data.reply}]);
      setChats(await request("/conversations"));
    } catch(e) {
      Alert.alert("Message failed",e instanceof Error?e.message:"Try again");
    } finally { setBusy(false); }
  }

  if(restoring) return <SafeAreaView style={s.root}><ActivityIndicator color="#d6b66d" /></SafeAreaView>;

  if(!token) return <SafeAreaView style={s.root}>
    <StatusBar barStyle="light-content"/>
    <Text style={s.brand}>◉ OMNIVARA</Text>
    <Text style={s.tag}>INTELLIGENCE WITHOUT LIMITS</Text>
    <Text style={s.heading}>{registerMode?"Create account":"Welcome back"}</Text>
    <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor="#929cab" style={s.input}/>
    <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password (8+ characters)" placeholderTextColor="#929cab" style={s.input}/>
    <Pressable onPress={authenticate} disabled={busy} style={s.button}>
      <Text style={s.buttonText}>{busy?"Please wait…":registerMode?"Create account":"Log in"}</Text>
    </Pressable>
    <Pressable onPress={()=>setRegisterMode(v=>!v)}>
      <Text style={s.link}>{registerMode?"Already registered? Log in":"New here? Create an account"}</Text>
    </Pressable>
    <Text style={s.note}>API: {API_URL}</Text>
  </SafeAreaView>;

  return <SafeAreaView style={s.root}>
    <StatusBar barStyle="light-content"/>
    <View style={s.header}>
      <Text style={s.brand}>◉ OMNIVARA</Text>
      <Pressable onPress={logout}><Text style={s.link}>Log out</Text></Pressable>
    </View>
    <ScrollView horizontal style={{maxHeight:54,flexGrow:0}} contentContainerStyle={{gap:8,alignItems:"center"}}>
      <Pressable style={s.chatChip} onPress={()=>{setActiveId(null);setMessages([]);}}>
        <Text style={s.buttonText}>+ New chat</Text>
      </Pressable>
      {chats.map(c=><Pressable key={c.id} style={s.chatChip} onPress={()=>openChat(c.id)}>
        <Text style={s.buttonText}>{c.title.slice(0,22)}</Text>
      </Pressable>)}
    </ScrollView>
    <ScrollView style={{flex:1}} contentContainerStyle={{paddingVertical:18}}>
      {messages.length===0&&<Text style={s.heading}>How can I help you today?</Text>}
      {messages.map((m,i)=><View key={i} style={s.card}>
        <Text style={s.gold}>{m.role==="assistant"?"OMNIVARA":"YOU"}</Text>
        <Text style={s.reply}>{m.content}</Text>
        {m.role==="assistant"&&<Pressable onPress={()=>speakReply(m.content)} style={s.listenButton}>
          <Text style={s.link}>🔊 উত্তর শুনুন</Text>
        </Pressable>}
      </View>)}
      {busy&&<Text style={s.link}>OMNIVARA is thinking…</Text>}
    </ScrollView>
    <View style={s.row}>
      <Pressable onPress={startVoiceInput} disabled={busy} style={[s.micButton,listening&&s.micActive]}>
        <Text style={s.buttonText}>{listening?"■":"🎤"}</Text>
      </Pressable>
      <TextInput value={message} onChangeText={setMessage} placeholder={listening?"শুনছি… বলুন":"আপনার প্রশ্ন লিখুন..."} placeholderTextColor="#929cab" style={[s.input,{flex:1,marginBottom:0}]}/>
      <Pressable onPress={send} disabled={busy||!message.trim()} style={s.button}>
        <Text style={s.buttonText}>↑</Text>
      </Pressable>
    </View>
    <Text style={s.voiceHint}>{listening?"কথা শেষ হলে মাইক্রোফোনে আবার চাপ দিন":"মাইক্রোফোনে কথা বলুন অথবা 🔊 দিয়ে উত্তর শুনুন"}</Text>
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
 note:{color:"#929cab",fontSize:10,marginTop:18},
 row:{flexDirection:"row",gap:8,alignItems:"center"},
 card:{backgroundColor:"#121923",padding:16,borderRadius:14,marginBottom:12},
 gold:{color:"#d6b66d",fontSize:10,letterSpacing:2},
 reply:{color:"#f4f2ec",fontSize:16,lineHeight:24,marginTop:8},
 chatChip:{backgroundColor:"#263342",padding:10,borderRadius:10},
 micButton:{backgroundColor:"#263342",padding:14,borderRadius:10,alignItems:"center",justifyContent:"center"},
 micActive:{backgroundColor:"#d6b66d"},
 listenButton:{alignSelf:"flex-start",marginTop:4},
 voiceHint:{color:"#929cab",fontSize:11,textAlign:"center",paddingTop:8}
});
