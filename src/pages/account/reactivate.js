import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Link from 'next/link';

// 스타일 컴포넌트
import {
  Container,
  Box,
  Heading,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  VStack,
  HStack,
  useToast,
  Divider,
} from '@chakra-ui/react';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AccountReactivate() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [remainingDays, setRemainingDays] = useState(0);
  
  const router = useRouter();
  const toast = useToast();
  
  // URL에서 이메일 파라미터 가져오기
  useEffect(() => {
    if (router.query.email) {
      setEmail(router.query.email);
      checkWithdrawnStatus(router.query.email);
    }
  }, [router.query]);
  
  // 탈퇴 상태 및 복구 가능 여부 확인
  async function checkWithdrawnStatus(userEmail) {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/check-withdrawn-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      
      const data = await response.json();
      
      if (data.isWithdrawn && data.canReactivate) {
        setAccountInfo(data);
        
        // 남은 일수 계산
        const deletionDate = new Date(data.deletionDate);
        const now = new Date();
        const diffTime = deletionDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setRemainingDays(diffDays);
      } else if (data.isWithdrawn && !data.canReactivate) {
        setError('이 계정은 복구 기간(1개월)이 만료되어 더 이상 복구할 수 없습니다.');
        setTimeout(() => {
          router.push('/auth/signup');
        }, 5000);
      } else {
        setError('탈퇴한 계정이 아니거나 찾을 수 없는 계정입니다.');
      }
    } catch (err) {
      console.error('탈퇴 상태 확인 오류:', err);
      setError('계정 상태를 확인하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }
  
  // 계정 복구 처리
  async function handleReactivate(e) {
    e.preventDefault();
    
    if (!email || !password) {
      setError('이메일과 새 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/reactivate-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          password,
          userId: accountInfo?.userId
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        toast({
          title: '계정 복구 완료',
          description: '계정이 성공적으로 복구되었습니다. 새 비밀번호로 로그인해주세요.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // 로그인 페이지로 리다이렉트
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      } else {
        setError(data.message || '계정 복구 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('계정 복구 오류:', err);
      setError('계정 복구 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }
  
  // 새 계정으로 가입하기
  function handleSignup() {
    router.push('/auth/signup');
  }
  
  return (
    <Container maxW="lg" py={12}>
      <Box 
        p={8} 
        borderWidth={1} 
        borderRadius={8} 
        boxShadow="lg" 
        bg="white"
      >
        <VStack spacing={6} align="stretch">
          <Heading textAlign="center" size="xl">계정 복구</Heading>
          
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          {success ? (
            <VStack spacing={4} align="center">
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                계정이 성공적으로 복구되었습니다!
              </Alert>
              <Text>잠시 후 로그인 페이지로 이동합니다...</Text>
            </VStack>
          ) : accountInfo ? (
            <Box as="form" onSubmit={handleReactivate}>
              <VStack spacing={4} align="stretch">
                <Text>
                  <strong>{email}</strong> 계정을 복구할 수 있습니다.
                </Text>
                
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  복구 가능 기간이 {remainingDays}일 남았습니다. 이 기간이 지나면 계정 데이터가 영구 삭제됩니다.
                </Alert>
                
                <FormControl id="email" isRequired>
                  <FormLabel>이메일</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    isReadOnly
                    bg="gray.100"
                  />
                </FormControl>
                
                <FormControl id="password" isRequired>
                  <FormLabel>새 비밀번호</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="새 비밀번호 입력"
                    minLength={8}
                  />
                </FormControl>
                
                <Button
                  type="submit"
                  colorScheme="blue"
                  width="full"
                  mt={4}
                  isLoading={loading}
                >
                  계정 복구하기
                </Button>
                
                <Divider />
                
                <Text textAlign="center">
                  다른 계정으로 로그인하시겠습니까?{' '}
                  <Link href="/auth/signin" passHref>
                    <Button as="a" variant="link" colorScheme="blue">
                      로그인
                    </Button>
                  </Link>
                </Text>
              </VStack>
            </Box>
          ) : (
            <VStack spacing={4}>
              <Text>계정 정보를 확인 중입니다...</Text>
              {loading && <Text>로딩 중...</Text>}
              
              <Button
                onClick={handleSignup}
                colorScheme="gray"
                width="full"
              >
                새 계정으로 가입하기
              </Button>
            </VStack>
          )}
        </VStack>
      </Box>
    </Container>
  );
} 