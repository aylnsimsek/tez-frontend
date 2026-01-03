'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, User, LogOut, Radio } from "lucide-react";

interface Broadcast {
  id: string;
  stream_key: string;
  room_name: string;
  broadcaster_id: string;
  broadcaster_name: string;
  broadcaster_avatar_url: string | null;
  title: string | null;
  status: string;
  viewer_count: number;
  started_at: string;
}

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [liveBroadcasts, setLiveBroadcasts] = useState<Broadcast[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(true);

  useEffect(() => {
    loadLiveBroadcasts();
    
    // Realtime subscription
    const channel = supabase
      .channel('live-broadcasts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcasts',
          filter: 'status=eq.live',
        },
        () => {
          loadLiveBroadcasts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLiveBroadcasts = async () => {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) setLiveBroadcasts(data);
    } catch (err) {
      console.error('Yayınlar yüklenemedi:', err);
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleWatchBroadcast = (roomName: string) => {
    router.push(`/watch?room=${roomName}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <main className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Yayın Platformu</h1>
            <p className="text-muted-foreground">
              WebRTC ile canlı yayın yapın ve izleyin
            </p>
          </div>
          
          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link href="/login">Giriş Yap</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/register">Kayıt Ol</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Radio className="h-6 w-6" />
            <span className="text-xl font-bold">Yayın Platformu</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push('/broadcast')}
            >
              <Video className="h-4 w-4 mr-2" />
              Yayın Aç
            </Button>
            
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profil"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {user.user_metadata?.display_name || user.email?.split('@')[0] || 'Kullanıcı'}
                </span>
              </Button>
            </Link>
            
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Canlı Yayınlar</h2>
          <p className="text-muted-foreground">
            {liveBroadcasts.length > 0 
              ? `${liveBroadcasts.length} aktif yayın` 
              : 'Şu anda canlı yayın yok'}
          </p>
        </div>

        {loadingBroadcasts ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Yayınlar yükleniyor...</p>
          </div>
        ) : liveBroadcasts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveBroadcasts.map((broadcast) => (
              <Card
                key={broadcast.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => handleWatchBroadcast(broadcast.room_name)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-16 w-16 text-muted-foreground" />
                  </div>
                  
                  {/* Live Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-semibold">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    CANLI
                  </div>
                  
                  {/* Viewer Count */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                    <span>👁</span>
                    {broadcast.viewer_count || 0}
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {broadcast.broadcaster_avatar_url ? (
                      <img
                        src={broadcast.broadcaster_avatar_url}
                        alt={broadcast.broadcaster_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {broadcast.broadcaster_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate group-hover:text-primary transition-colors">
                        {broadcast.title || broadcast.room_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {broadcast.broadcaster_name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Henüz yayın yok</h3>
            <p className="text-muted-foreground mb-4">
              İlk yayını başlatmak için yukarıdaki "Yayın Aç" butonuna tıklayın
            </p>
            <Button onClick={() => router.push('/broadcast')}>
              <Video className="h-4 w-4 mr-2" />
              Yayın Başlat
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
