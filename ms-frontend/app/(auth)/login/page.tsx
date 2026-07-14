"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validations/schemas";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/app/providers";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, Play } from "lucide-react";
import { z } from "zod";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingState, setIsSubmittingState] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmittingState(true);
    try {
      await login(values.email, values.password);
      toast("Login realizado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      toast(err.message || "Credenciais inválidas. Verifique e tente novamente.", "error");
    } finally {
      setIsSubmittingState(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-black uppercase text-slate-800 dark:text-slate-200 mb-1"
          >
            E-mail
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-black dark:text-white">
              <Mail className="h-5 w-5" />
            </div>
            <input
              id="email"
              type="email"
              placeholder="seuemail@empresa.com"
              {...register("email")}
              className={`block w-full pl-10 pr-3 py-2.5 neo-input ${
                errors.email ? "bg-rose-100" : ""
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-650 px-2.5 py-1 inline-block uppercase">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-black uppercase text-slate-800 dark:text-slate-200 mb-1"
          >
            Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-black dark:text-white">
              <Lock className="h-5 w-5" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("password")}
              className={`block w-full pl-10 pr-10 py-2.5 neo-input ${
                errors.password ? "bg-rose-100" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-700 dark:text-slate-300"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-650 px-2.5 py-1 inline-block uppercase">
              {errors.password.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmittingState}
          className="w-full flex justify-center items-center py-3 px-4 neo-btn-primary"
        >
          {isSubmittingState ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Entrar na plataforma
        </button>
      </div>

      <div className="text-center text-sm mt-4 font-bold text-slate-700 dark:text-slate-300">
        Não tem uma conta?{" "}
        <Link
          href="/cadastro"
          className="text-indigo-650 dark:text-indigo-400 underline hover:text-indigo-800 transition-colors"
        >
          Cadastre-se gratuitamente
        </Link>
      </div>
    </form>
  );
}
