'use client';
import { useState } from 'react';

export default function FreeGuidePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    // TODO: wire up your email service here
    setSubmitted(true);
  }

  const bullets: [string, string][] = [
    ['Why your BLE app disconnects even when your code looks right','The underlying architecture mistakes that quietly break your connection lifecycle.'],
    ['The hidden platform quirks causing unstable callbacks + failed notifications','The iOS/Android differences that silently kill reliability.'],
    ['Proven connection flows you can copy to stabilize your BLE layer fast','Battle-tested patterns used in real production apps.'],
  ];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, overflowY:'auto', background:'linear-gradient(135deg,#0d0d3d 0%,#0a0a2e 50%,#111145 100%)', fontFamily:'Inter,system-ui,sans-serif' }}>
      <div style={{ position:'absolute', inset:0, zIndex:0, opacity:0.12, pointerEvents:'none', backgroundImage:'radial-gradient(circle,#4da6ff 1px,transparent 1px)', backgroundSize:'28px 28px' }} />
      <div style={{ position:'relative', zIndex:1, maxWidth:'1100px', margin:'0 auto', padding:'60px 24px 80px', display:'flex', gap:'56px', alignItems:'flex-start', flexWrap:'wrap' }}>

        <div style={{ flex:'1 1 400px', color:'#fff' }}>
          <h1 style={{ fontSize:'clamp(26px,4vw,42px)', fontWeight:800, lineHeight:1.2, marginBottom:'14px' }}>
            BLE Isn&apos;t Like Flutter, Swift, or Kotlin
          </h1>
          <p style={{ fontSize:'clamp(20px,3vw,34px)', fontWeight:700, lineHeight:1.3, color:'#4da6ff', marginBottom:'28px' }}>
            And that&apos;s <em>exactly</em> why your app keeps disconnecting.
          </p>
          <p style={{ fontSize:'17px', lineHeight:1.75, color:'#c5c5e0', marginBottom:'20px' }}>
            You&apos;re already a strong mobile dev — but BLE has its own rules, timing constraints, and platform quirks that even experienced engineers struggle with.
          </p>
          <p style={{ fontSize:'17px', lineHeight:1.75, color:'#c5c5e0', marginBottom:'32px' }}>
            This free guide breaks down the <strong style={{color:'#fff'}}>7 BLE issues</strong> that cause unstable connections and gives you <strong style={{color:'#fff'}}>clean, production-ready fixes</strong> you can apply immediately.
          </p>
          <h3 style={{ fontSize:'18px', fontWeight:700, marginBottom:'22px' }}>This Guide Includes:</h3>
          {bullets.map(([title,body],i) => (
            <div key={i} style={{ display:'flex', gap:'14px', marginBottom:'22px', alignItems:'flex-start' }}>
              <span style={{ flexShrink:0, width:'24px', height:'24px', background:'#4da6ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', color:'#fff', marginTop:'2px' }}>&#10003;</span>
              <div>
                <p style={{ fontWeight:700, color:'#fff', marginBottom:'5px', fontSize:'16px' }}>{title}</p>
                <p style={{ color:'#9090b8', fontSize:'15px', lineHeight:1.65 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex:'0 0 360px', background:'#fff', borderRadius:'16px', padding:'36px 32px', boxShadow:'0 24px 80px rgba(0,0,0,0.45)' }}>
          {submitted ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:'52px', marginBottom:'16px' }}>&#127881;</div>
              <h2 style={{ fontSize:'22px', fontWeight:800, color:'#0d0d3d', marginBottom:'12px' }}>Check your inbox!</h2>
              <p style={{ color:'#555', lineHeight:1.65, marginBottom:'20px' }}>
                Your free guide is on its way. Check your email (and spam) for <strong>&quot;Why Your BLE App Keeps Disconnecting&quot;</strong>.
              </p>
              <a href="/blog" style={{ color:'#4da6ff', fontWeight:600, textDecoration:'none', fontSize:'15px' }}>Explore the BLE Flutter Blog &#8594;</a>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize:'21px', fontWeight:800, textAlign:'center', color:'#0d0d3d', marginBottom:'16px', lineHeight:1.3 }}>
                Why Your BLE App Keeps Disconnecting
              </h2>
              <div style={{ textAlign:'center', marginBottom:'12px' }}>
                <img src="https://d1yei2z3i6k35z.cloudfront.net/15235605/6926e86795d82_Untitled_design__4_-removebg-preview.png" alt="Free BLE Flutter Guide" style={{ maxWidth:'190px', width:'100%' }} />
              </div>
              <p style={{ textAlign:'center', fontSize:'13px', color:'#666', marginBottom:'24px', fontWeight:500 }}>
                Join 1,000+ Flutter developers who&apos;ve solved their BLE issues
              </p>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom:'14px' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#333', marginBottom:'6px' }}>Enter name <span style={{color:'#e53e3e'}}>*</span></label>
                  <input type="text" placeholder="John" value={name} required onChange={e=>setName(e.target.value)} style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #ddd', borderRadius:'8px', fontSize:'15px', boxSizing:'border-box', outline:'none' }} />
                </div>
                <div style={{ marginBottom:'20px' }}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#333', marginBottom:'6px' }}>Enter email address <span style={{color:'#e53e3e'}}>*</span></label>
                  <input type="email" placeholder="john@company.com" value={email} required onChange={e=>setEmail(e.target.value)} style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #ddd', borderRadius:'8px', fontSize:'15px', boxSizing:'border-box', outline:'none' }} />
                </div>
                <button type="submit" style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#3b7fe8,#6c3fc5)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:700, cursor:'pointer' }}>
                  Get Instant Access to the Guide
                </button>
              </form>
              <p style={{ textAlign:'center', fontSize:'12px', color:'#aaa', marginTop:'14px' }}>
                Instant download — We respect your privacy. Unsubscribe at any time.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}