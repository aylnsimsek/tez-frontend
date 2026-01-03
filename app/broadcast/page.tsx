'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Room, RoomEvent, Track, createLocalVideoTrack, LocalVideoTrack } from 'livekit-client';
import { getLiveKitUrl } from '@/lib/livekit';
import Chat from '@/components/Chat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Video, VideoOff, Monitor, Square, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BroadcastPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const [broadcastId, setBroadcastId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const startBroadcast = async () => {
    if (!roomName) {
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
          roomName,
          participantName,
          participantMetadata: JSON.stringify({ 
            isBroadcaster: true,
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

      // DB'ye yayın kaydı oluştur
      const broadcasterName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Kullanıcı';
      const broadcasterAvatar = user.user_metadata?.avatar_url || null;
      
      const { data: broadcastData, error: broadcastError } = await supabase
        .from('broadcasts')
        .insert({
          room_name: roomName,
          broadcaster_id: user.id,
          broadcaster_name: broadcasterName,
          broadcaster_avatar_url: broadcasterAvatar,
          title: roomName,
          status: 'live',
        })
        .select()
        .single();

      if (broadcastError) {
        console.error('Yayın kaydı oluşturma hatası:', broadcastError);
        // Hata olsa bile yayına devam et
      } else if (broadcastData) {
        setStreamKey(broadcastData.stream_key);
        setBroadcastId(broadcastData.id);
      }

      // Kamera ve mikrofonu aç
      await newRoom.localParticipant.enableCameraAndMicrophone();

      // Yerel video track'ini göster
      newRoom.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
        console.log('Local track published:', publication.kind, publication.source);
        if (publication.track && publication.kind === 'video' && videoRef.current) {
          publication.track.attach(videoRef.current);
        }
      });

      newRoom.on(RoomEvent.LocalTrackUnpublished, (publication, participant) => {
        if (publication.kind === 'video' && videoRef.current) {
          videoRef.current.srcObject = null;
        }
      });

      // İlk track'leri kontrol et
      setTimeout(() => {
        newRoom.localParticipant.videoTrackPublications.forEach((publication) => {
          if (publication.track && publication.kind === 'video') {
            console.log('Attaching local video track');
            if (videoRef.current) {
              publication.track.attach(videoRef.current);
            }
          }
        });
      }, 500);
    } catch (err) {
      console.error('Yayın başlatma hatası:', err);
      setError(err instanceof Error ? err.message : 'Yayın başlatılamadı');
    }
  };

  const stopBroadcast = async () => {
    if (room) {
      room.disconnect();
      setIsConnected(false);
      setRoom(null);
      setIsMicEnabled(false);
      setIsCameraEnabled(false);
      setIsScreenSharing(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // DB'de yayın durumunu güncelle
      if (broadcastId) {
        await supabase
          .from('broadcasts')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', broadcastId);
        
        setBroadcastId(null);
        setStreamKey(null);
      }
    }
  };

  const toggleMicrophone = async () => {
    if (!room) return;
    
    try {
      const micEnabled = !isMicEnabled;
      await room.localParticipant.setMicrophoneEnabled(micEnabled);
      setIsMicEnabled(micEnabled);
    } catch (err) {
      console.error('Mikrofon hatası:', err);
      setError('Mikrofon açılamadı/kapatılamadı');
    }
  };

  const toggleCamera = async () => {
    if (!room) return;
    
    // Ekran paylaşımı aktifken kamera açılamaz
    if (isScreenSharing && isCameraEnabled === false) {
      setError('Ekran paylaşımı aktifken kamera açılamaz. Önce ekran paylaşımını durdurun.');
      return;
    }
    
    try {
      const cameraEnabled = !isCameraEnabled;
      
      if (cameraEnabled) {
        // Kamerayı aç
        await room.localParticipant.setCameraEnabled(true);
        setIsCameraEnabled(true);
        
        // Kamerayı video elementine bağla
        setTimeout(() => {
          room.localParticipant.videoTrackPublications.forEach((publication) => {
            if (publication.track && publication.kind === 'video' && publication.source === Track.Source.Camera) {
              if (videoRef.current) {
                publication.track.attach(videoRef.current);
              }
            }
          });
        }, 100);
      } else {
        // Kamerayı kapat ve track'leri unpublish et
        room.localParticipant.videoTrackPublications.forEach((publication) => {
          if (publication.source === Track.Source.Camera && publication.track) {
            room.localParticipant.unpublishTrack(publication.track);
          }
        });
        await room.localParticipant.setCameraEnabled(false);
        setIsCameraEnabled(false);
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    } catch (err) {
      console.error('Kamera hatası:', err);
      setError('Kamera açılamadı/kapatılamadı');
    }
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    
    try {
      if (isScreenSharing) {
        // Önce video elementini temizle
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        // Ekran paylaşımı track'lerini durdur ve unpublish et
        const screenSharePublications = Array.from(room.localParticipant.videoTrackPublications.values()).filter(
          (publication) => publication.source === Track.Source.ScreenShare
        );
        
        for (const publication of screenSharePublications) {
          if (publication.track) {
            publication.track.stop(); // Track'i durdur
            await room.localParticipant.unpublishTrack(publication.track);
          }
        }
        
        setIsScreenSharing(false);
        
        // Track'lerin temizlenmesi için bekle
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Kamerayı tekrar aç
        try {
          await room.localParticipant.setCameraEnabled(true);
          setIsCameraEnabled(true);
          
          // Kamerayı video elementine bağla - biraz bekle
          await new Promise(resolve => setTimeout(resolve, 200));
          
          room.localParticipant.videoTrackPublications.forEach((publication) => {
            if (publication.track && publication.kind === 'video' && publication.source === Track.Source.Camera) {
              if (videoRef.current) {
                publication.track.attach(videoRef.current);
              }
            }
          });
        } catch (err) {
          console.error('Kamera açma hatası:', err);
          setError('Kamera açılamadı. Lütfen sayfayı yenileyin.');
        }
      } else {
        // Önce video elementini temizle
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        // Mevcut kamera track'lerini durdur ve unpublish et
        const cameraPublications = Array.from(room.localParticipant.videoTrackPublications.values()).filter(
          (publication) => publication.source === Track.Source.Camera
        );
        
        for (const publication of cameraPublications) {
          if (publication.track) {
            publication.track.stop(); // Track'i durdur
            await room.localParticipant.unpublishTrack(publication.track);
          }
        }
        
        // Kamerayı kapat
        await room.localParticipant.setCameraEnabled(false);
        setIsCameraEnabled(false);
        
        // Track'lerin temizlenmesi için bekle
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
          // Tarayıcının ekran paylaşımı API'sini kullan
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'monitor', // veya 'window', 'browser'
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false, // Ekran paylaşımında ses genelde yok
          });
          
          // Stream'den video track'i al
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length === 0) {
            throw new Error('Ekran paylaşımı için video track bulunamadı');
          }
          
          const mediaTrack = videoTracks[0];
          
          // Stream'in sonlanmasını dinle (kullanıcı paylaşımı durdurursa)
          mediaTrack.addEventListener('ended', () => {
            if (room && isScreenSharing) {
              toggleScreenShare(); // Otomatik olarak durdur
            }
          });
          
          // LiveKit LocalVideoTrack oluştur - MediaStreamTrack'ten
          const screenTrack = new LocalVideoTrack(mediaTrack);
          
          // Ekran paylaşımı olarak publish et
          await room.localParticipant.publishTrack(screenTrack, {
            source: Track.Source.ScreenShare,
          });
          
          // Ekran paylaşımını video elementine bağla
          if (videoRef.current) {
            // Önce mevcut video track'lerini temizle
            videoRef.current.srcObject = null;
            screenTrack.attach(videoRef.current);
          }
          
          setIsScreenSharing(true);
        } catch (err: any) {
          console.error('Ekran paylaşımı hatası:', err);
          
          // Kullanıcı iptal ettiyse hata gösterme
          if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
            setError('Ekran paylaşımı başlatılamadı: ' + (err.message || 'Bilinmeyen hata'));
          }
          
          // Hata durumunda kamerayı tekrar aç
          await room.localParticipant.setCameraEnabled(true);
          setIsCameraEnabled(true);
        }
      }
    } catch (err) {
      console.error('Ekran paylaşımı hatası:', err);
      setError('Ekran paylaşımı başlatılamadı');
      // Hata durumunda kamerayı tekrar aç
      await room.localParticipant.setCameraEnabled(true);
      setIsCameraEnabled(true);
    }
  };

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

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
          <h1 className="text-xl font-bold">Yayın Yap</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Yükleniyor...</p>
            </CardContent>
          </Card>
        ) : !user ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Giriş yapmanız gerekiyor</p>
            </CardContent>
          </Card>
        ) : !isConnected ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Yayın Başlat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Oda Adı</label>
                <Input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="örn: yayin-1"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Yayıncı: {user.user_metadata?.display_name || user.email?.split('@')[0] || 'Kullanıcı'}
              </div>
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <Button onClick={startBroadcast} className="w-full" size="lg">
                <Video className="h-4 w-4 mr-2" />
                Yayını Başlat
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-black rounded-t-lg">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full rounded-t-lg"
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Kontrol Butonları */}
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={toggleMicrophone}
                  variant={isMicEnabled ? "default" : "destructive"}
                  size="sm"
                >
                  {isMicEnabled ? (
                    <Mic className="h-4 w-4 mr-2" />
                  ) : (
                    <MicOff className="h-4 w-4 mr-2" />
                  )}
                  {isMicEnabled ? 'Mikrofon' : 'Mikrofon Kapalı'}
                </Button>

                <Button
                  onClick={toggleCamera}
                  variant={isCameraEnabled ? "default" : "destructive"}
                  size="sm"
                >
                  {isCameraEnabled ? (
                    <Video className="h-4 w-4 mr-2" />
                  ) : (
                    <VideoOff className="h-4 w-4 mr-2" />
                  )}
                  {isCameraEnabled ? 'Kamera' : 'Kamera Kapalı'}
                </Button>

                <Button
                  onClick={toggleScreenShare}
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="sm"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  {isScreenSharing ? 'Paylaşımı Durdur' : 'Ekran Paylaş'}
                </Button>

                <Button
                  onClick={stopBroadcast}
                  variant="destructive"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Yayını Durdur
                </Button>
              </div>

              <div className="mt-4 text-sm text-muted-foreground text-center">
                Oda: {roomName} | Yayıncı: {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Kullanıcı'}
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

