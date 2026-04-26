'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '@/lib/auth'

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error: authError } = isSignUp
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password)

    if (authError) {
      setError(authError.message)
    } else if (isSignUp) {
      setMessage('確認メールを送信しました。メールを確認してください。')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setError('')
    const { error: authError } = await signInWithGoogle()
    if (authError) setError(authError.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Glucose Diary</CardTitle>
          <CardDescription>血糖自己管理アプリ</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '処理中...' : isSignUp ? 'アカウント作成' : 'ログイン'}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">または</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
            Googleでログイン
          </Button>

          <p className="text-center text-sm mt-4">
            {isSignUp ? 'アカウントをお持ちですか？' : 'アカウントがありませんか？'}
            <button
              type="button"
              className="text-blue-600 hover:underline ml-1"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
            >
              {isSignUp ? 'ログイン' : 'アカウント作成'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
