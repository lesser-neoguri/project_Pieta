'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type UserType = 'regular' | 'vendor' | 'wholesaler';

interface SignupFormProps {
  userType: UserType;
}

export default function SignupForm({ userType }: SignupFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phoneNumber: '',
    companyName: '',
    businessNumber: '',
  });

  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
    businessNumber: '',
    email: '',
  });

  const [loading, setLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return '비밀번호는 최소 8자 이상이어야 합니다.';
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/.test(password)) {
      return '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.';
    }
    return '';
  };

  const validateBusinessNumber = (number: string) => {
    const cleanNumber = number.replace(/-/g, '');
    if (!/^\d{10}$/.test(cleanNumber)) {
      return '사업자등록번호는 10자리 숫자여야 합니다.';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // 유효성 검사
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = formData.password !== formData.confirmPassword 
      ? '비밀번호가 일치하지 않습니다.' 
      : '';
    const businessNumberError = userType !== 'regular' ? validateBusinessNumber(formData.businessNumber) : '';
    
    // 이메일 중복 검사 (제출 시 최종 확인)
    const emailError = await checkEmailDuplicate(formData.email);

    setErrors({
      password: passwordError,
      confirmPassword: confirmPasswordError,
      businessNumber: businessNumberError,
      email: emailError,
    });

    if (passwordError || confirmPasswordError || businessNumberError || emailError) {
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            user_type: userType,
            name: userType === 'regular' ? formData.name : formData.companyName,
          }
        }
      });

      if (authError) {
        // Supabase Auth 오류 처리
        if (authError.message.includes('already registered')) {
          setErrors(prev => ({
            ...prev,
            email: '이미 등록된 이메일입니다.'
          }));
          setLoading(false);
          return;
        }
        throw authError;
      }

      if (authData.user) {
        const userData = {
          id: authData.user.id,
          email: formData.email,
          phone: formData.phoneNumber,
          user_type: userType,
          name: userType === 'regular' ? formData.name : formData.companyName,
          ...(userType !== 'regular' && {
            business_number: formData.businessNumber,
          }),
        };

        const { error: profileError } = await supabase
          .from('users')
          .insert([userData]);

        if (profileError) {
          // 프로필 생성 실패 시 Auth 사용자도 삭제
          if (authData.user.id) {
            try {
              await supabase.auth.admin.deleteUser(authData.user.id);
            } catch (deleteError) {
              console.error('Auth 사용자 삭제 실패:', deleteError);
            }
          }
          throw profileError;
        }
      }

      setMessage({
        text: '회원가입 이메일이 발송되었습니다. 이메일을 확인해주세요.',
        type: 'success'
      });

      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        phoneNumber: '',
        companyName: '',
        businessNumber: '',
      });
    } catch (error: any) {
      setMessage({
        text: error.message || '회원가입 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password') {
      setErrors(prev => ({
        ...prev,
        password: validatePassword(value),
        confirmPassword: value !== formData.confirmPassword ? '비밀번호가 일치하지 않습니다.' : ''
      }));
    } else if (name === 'confirmPassword') {
      setErrors(prev => ({
        ...prev,
        confirmPassword: value !== formData.password ? '비밀번호가 일치하지 않습니다.' : ''
      }));
    } else if (name === 'businessNumber' && userType !== 'regular') {
      setErrors(prev => ({
        ...prev,
        businessNumber: validateBusinessNumber(value)
      }));
    } else if (name === 'email') {
      // 이메일 입력 시 기존 에러 메시지 및 유효성 상태 제거
      setErrors(prev => ({
        ...prev,
        email: ''
      }));
      setEmailValid(false);
    }
  };

  // 이메일 중복 검사 함수
  const checkEmailDuplicate = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailValid(false);
      return '';
    }

    setEmailChecking(true);
    setEmailValid(false);
    
    try {
      // 1. users 테이블에서 확인 (현재 활성 사용자)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase())
        .single();

      if (userData) {
        return '이미 사용 중인 이메일입니다.';
      }

      // 2. withdrawn_users 테이블에서 확인 (탈퇴한 계정)
      // original_email 컬럼이 있다면 그것도 확인
      const { data: withdrawnUser } = await supabase
        .from('withdrawn_users')
        .select('email, original_email')
        .or(`email.eq.${email.toLowerCase()},original_email.eq.${email.toLowerCase()}`)
        .single();

      if (withdrawnUser) {
        return '탈퇴한 계정의 이메일입니다. 계정 복구를 원하시면 복구 페이지를 이용해주세요.';
      }

      // 3. Supabase Auth에서도 확인 (추가 보안)
      try {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const existingAuthUser = authUsers.users?.find(user => 
          user.email?.toLowerCase() === email.toLowerCase()
        );
        
        if (existingAuthUser) {
          return '이미 등록된 이메일입니다.';
        }
      } catch (authError) {
        // Auth 확인 실패 시 무시 (권한 문제일 수 있음)
        console.log('Auth 사용자 확인 중 오류 (무시됨):', authError);
      }

      // 모든 검사를 통과하면 사용 가능한 이메일
      setEmailValid(true);
      return '';
    } catch (error) {
      console.error('이메일 중복 검사 오류:', error);
      // 오류 발생 시에도 가입을 막지 않음 (서버에서 최종 검증)
      setEmailValid(false);
      return '';
    } finally {
      setEmailChecking(false);
    }
  };

  // 이메일 중복 검사 핸들러
  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value;
    if (email) {
      const emailError = await checkEmailDuplicate(email);
      setErrors(prev => ({
        ...prev,
        email: emailError
      }));
    }
  };

  const titles = {
    regular: '일반회원 가입',
    vendor: '소매회원 가입',
    wholesaler: '도매회원 가입'
  };

  const inputStyle = "mt-2 block w-full border-0 border-b border-gray-200 py-3 px-0 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-0 text-sm transition-colors";
  const labelStyle = "text-xs uppercase tracking-widest font-medium text-gray-500";
  const errorStyle = "mt-2 text-xs text-red-600 tracking-wide";

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-md w-full space-y-12">
        <div className="space-y-6">
          <h1 className="text-center text-2xl font-light tracking-[0.2em] uppercase text-gray-900">
            {titles[userType]}
          </h1>
          {message && (
            <div className={`py-3 text-center text-sm tracking-wide ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {userType !== 'regular' ? (
            <>
              <div className="space-y-6">
                <div>
                  <label htmlFor="companyName" className={labelStyle}>
                    회사명
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    className={inputStyle}
                    value={formData.companyName}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="businessNumber" className={labelStyle}>
                    사업자등록번호
                  </label>
                  <input
                    id="businessNumber"
                    name="businessNumber"
                    type="text"
                    required
                    placeholder="000-00-00000"
                    className={inputStyle}
                    value={formData.businessNumber}
                    onChange={handleChange}
                  />
                  {errors.businessNumber && (
                    <p className={errorStyle}>{errors.businessNumber}</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="name" className={labelStyle}>
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className={inputStyle}
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="email" className={labelStyle}>
                이메일
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`${inputStyle} ${
                    errors.email 
                      ? 'border-red-500 focus:border-red-500' 
                      : emailValid 
                        ? 'border-green-500 focus:border-green-500' 
                        : ''
                  }`}
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                />
                <div className="absolute right-0 top-3">
                  {emailChecking && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  )}
                  {!emailChecking && emailValid && !errors.email && (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {!emailChecking && errors.email && (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
              {errors.email && (
                <p className={`${errorStyle} ${errors.email.includes('탈퇴한 계정') ? 'text-orange-600' : ''}`}>
                  {errors.email}
                  {errors.email.includes('탈퇴한 계정') && (
                    <Link 
                      href="/account/reactivate" 
                      className="ml-2 text-blue-600 hover:text-blue-700 underline"
                    >
                      복구하기
                    </Link>
                  )}
                </p>
              )}
              {!errors.email && emailValid && (
                <p className="mt-2 text-xs text-green-600 tracking-wide">
                  사용 가능한 이메일입니다.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={labelStyle}>
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={inputStyle}
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <p className={errorStyle}>{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelStyle}>
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className={inputStyle}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && (
                <p className={errorStyle}>{errors.confirmPassword}</p>
              )}
            </div>

            <div>
              <label htmlFor="phoneNumber" className={labelStyle}>
                전화번호
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                className={inputStyle}
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading || emailChecking || (formData.email && !emailValid)}
              className="w-full py-4 px-4 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 text-sm uppercase tracking-widest font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
            >
              {loading ? '처리 중...' : emailChecking ? '이메일 확인 중...' : '가입하기'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link 
            href="/signup" 
            className="text-xs text-gray-500 hover:text-black uppercase tracking-widest transition-colors"
          >
            회원가입 유형 선택으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
} 