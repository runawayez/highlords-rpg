// PeerJS replacement for browser integration tests. Routed by the Playwright test bridge.
class FakeConnection {
 constructor(owner,remote){this.owner=owner;this.peer=remote;this.open=false;this.handlers={}}
 on(event,callback){(this.handlers[event]||=[]).push(callback);return this}
 emit(event,...args){for(const cb of this.handlers[event]||[])cb(...args)}
 send(data){if(!this.open)throw Error('Conexão encerrada');void window.__p2pBridge({kind:'relay',to:this.peer,packet:{type:'data',from:this.owner.id,data}})}
 close(){if(!this.open)return;this.open=false;this.emit('close');void window.__p2pBridge({kind:'relay',to:this.peer,packet:{type:'close',from:this.owner.id}})}
}
class Peer {
 constructor(id){
  this.id=id||'guest-'+crypto.randomUUID();this.open=false;this.destroyed=false;this.disconnected=false;this.handlers={};this.links=new Map();
  window.__activeFakePeer=this;
  void window.__p2pBridge({kind:'register',id:this.id}).then(()=>{if(!this.destroyed){this.open=true;this.emit('open',this.id)}})
 }
 on(event,callback){(this.handlers[event]||=[]).push(callback);return this}
 emit(event,...args){for(const cb of this.handlers[event]||[])cb(...args)}
 connect(target){const c=new FakeConnection(this,target);this.links.set(target,c);void window.__p2pBridge({kind:'relay',to:target,packet:{type:'connect',from:this.id}});return c}
 receive(packet){
  if(packet.type==='connect'){
   const conn=new FakeConnection(this,packet.from);conn.open=true;this.links.set(packet.from,conn);
   this.emit('connection',conn);
   void window.__p2pBridge({kind:'relay',to:packet.from,packet:{type:'ack',from:this.id}});
  } else if(packet.type==='ack'){
   const conn=this.links.get(packet.from);if(conn){conn.open=true;conn.emit('open')}
  } else if(packet.type==='data')this.links.get(packet.from)?.emit('data',packet.data);
  else if(packet.type==='close'){const conn=this.links.get(packet.from);if(conn){conn.open=false;conn.emit('close')}}
 }
 reconnect(){this.disconnected=false;this.emit('open',this.id)}
 destroy(){this.destroyed=true;this.open=false;for(const c of this.links.values())c.close()}
}
window.__peerSignal=packet=>window.__activeFakePeer?.receive(packet);
