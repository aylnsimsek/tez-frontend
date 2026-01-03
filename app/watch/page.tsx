'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';
import { getLiveKitUrl } from '@/lib/livekit';
import Chat from '@/components/Chat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, Radio } from 'lucide-react';
import Link from 'next/link';

export default function WatchPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [broadcastInfo, setBroadcastInfo] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // URL'den room parametresini al
  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) {
      setRoomName(roomParam);
      loadBroadcastInfo(roomParam);
      // Otomatik olarak yayına katıl
      setTimeout(() => {
        joinRoom(roomParam);
      }, 500);
    }
  }, [searchParams]);

  const loadBroadcastInfo = async (room: string) => {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('room_name', room)
        .eq('status', 'live')
        .single();

      if (!error && data) {
        setBroadcastInfo(data);
      }
    } catch (err) {
      console.error('Yayın bilgisi yüklenemedi:', err);
    }
  };

  const updateViewerCount = async (increment: boolean) => {
    if (!broadcastInfo) return;
    
    try {
      const newCount = increment 
        ? (broadcastInfo.viewer_count || 0) + 1 
        : Math.max(0, (broadcastInfo.viewer_count || 0) - 1);
      
      await supabase
        .from('broadcasts')
        .update({ viewer_count: newCount })
        .eq('id', broadcastInfo.id);
      
      setBroadcastInfo({ ...broadcastInfo, viewer_count: newCount });
    } catch (err) {
      console.error('İzleyici sayısı güncellenemedi:', err);
    }
  };

  const joinRoom = async (room?: string) => {
    const targetRoom = room || roomName;
    
    if (!targetRoom) {
      setError('Lütfen oda adı girin');
      return;
    }

    if (!user) {
      setError('Giriş yapmanız gerekiyor');
      return;
    }

    try {
      setError(null);
      const newRoom = new Room();
      
      const participantName = user.user_metadata?.display_name || user.email?.split('@')[0] || user.id;
      
      // Token al
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: targetRoom,
          participantName,
          participantMetadata: JSON.stringify({ 
            isViewer: true,
            userId: user.id,
            email: user.email,
          }),
        }),
      });

      if (!response.ok) {
        throw new Error('Token alınamadı');
      }

      const { token } = await response.json();
      const url = getLiveKitUrl();

      // Odaya bağlan
      await newRoom.connect(url, token);
      setIsConnected(true);
      setRoom(newRoom);
      
      // İzleyici sayısını artır
      await updateViewerCount(true);
      
      // Remote participant'ları dinle
      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity);
        setRemoteParticipants(Array.from(newRoom.remoteParticipants.values()));
        
        // Yeni participant'ın track'lerini dinle
        participant.on('trackPublished', (publication) => {
          console.log('Remote track published:', publication.kind);
          if (publication.kind === 'video') {
            publication.setSubscribed(true);
          }
        });

        // Mevcut track'leri subscribe et
        participant.videoTrackPublications.forEach((publication) => {
          console.log('Subscribing to video track:', publication.trackSid);
          if (!publication.isSubscribed) {
            publication.setSubscribed(true);
          }
        });
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setRemoteParticipants(Array.from(newRoom.remoteParticipants.values()));
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, participant.identity);
        if (track.kind === 'video' && videoRef.current) {
          console.log('Attaching video track to element');
          track.attach(videoRef.current);
        }
      });

      newRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
        if (publication.kind === 'video' && participant !== newRoom.localParticipant) {
          publication.setSubscribed(true);
        }
      });

      // Mevcut participant'ları kontrol et
      setRemoteParticipants(Array.from(newRoom.remoteParticipants.values()));

      // Mevcut track'leri subscribe et ve attach et
      setTimeout(() => {
        newRoom.remoteParticipants.forEach((participant) => {
          console.log('Checking participant:', participant.identity);
          participant.videoTrackPublications.forEach((publication) => {
            if (publication.kind === 'video') {
              console.log('Found video track, subscribing...');
              if (!publication.isSubscribed) {
                publication.setSubscribed(true);
              }
              if (publication.track && videoRef.current) {
                console.log('Attaching existing video track');
                publication.track.attach(videoRef.current);
              }
            }
          });
        });
      }, 500);
    } catch (err) {
      console.error('Odaya katılma hatası:', err);
      setError(err instanceof Error ? err.message : 'Odaya katılınamadı');
    }
  };

  const leaveRoom = async () => {
    if (room) {
      // İzleyici sayısını azalt
      await updateViewerCount(false);
      
      room.disconnect();
      setIsConnected(false);
      setRoom(null);
      setRemoteParticipants([]);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      router.push('/');
    }
  };

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Sayfa
            </Button>
          </Link>
          
          {broadcastInfo && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {broadcastInfo.broadcaster_avatar_url ? (
                  <img
                    src={broadcastInfo.broadcaster_avatar_url}
                    alt={broadcastInfo.broadcaster_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs">
                      {broadcastInfo.broadcaster_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{broadcastInfo.broadcaster_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {broadcastInfo.title || broadcastInfo.room_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>{broadcastInfo.viewer_count || 0}</span>
                <span className="flex items-center gap-1 text-red-500">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  CANLI
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {!isConnected ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Yayına Katıl</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">Oda Adı</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="örn: yayin-1"
                  className="w-full px-4 py-2 bg-background border rounded-md"
                />
              </div>
              <Button onClick={() => joinRoom()} className="w-full">
                <Radio className="h-4 w-4 mr-2" />
                Yayına Katıl
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-black rounded-t-lg">
                    {remoteParticipants.length > 0 ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full rounded-t-lg"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Radio className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">Yayıncı bekleniyor...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="mt-4">
                <Button variant="destructive" onClick={leaveRoom}>
                  Yayından Ayrıl
                </Button>
              </div>
            </div>
            <div className="lg:col-span-1">
              <Chat roomName={roomName} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
