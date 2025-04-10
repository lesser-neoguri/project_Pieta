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
  });

  const [loading, setLoading] = useState(false);
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

    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = formData.password !== formData.confirmPassword 
      ? '비밀번호가 일치하지 않습니다.' 
      : '';
    const businessNumberError = userType !== 'regular' ? validateBusinessNumber(formData.businessNumber) : '';

    setErrors({
      password: passwordError,
      confirmPassword: confirmPasswordError,
      businessNumber: businessNumberError,
    });

    if (passwordError || confirmPasswordError || businessNumberError) {
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

      if (authError) throw authError;

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

        if (profileError) throw profileError;
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
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputStyle}
                value={formData.email}
                onChange={handleChange}
              />
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
              disabled={loading}
              className="w-full py-4 px-4 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 text-sm uppercase tracking-widest font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '처리 중...' : '가입하기'}
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