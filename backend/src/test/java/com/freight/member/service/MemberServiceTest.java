package com.freight.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.dto.LoginRequest;
import com.freight.member.dto.MemberResponse;
import com.freight.member.dto.SignupRequest;
import com.freight.member.dto.TokenResponse;
import com.freight.member.dto.UpdateProfileRequest;
import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MemberServiceTest {

    @Autowired
    private MemberService memberService;

    @Autowired
    private AuthService authService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("회원가입 시 이메일은 소문자로 저장되고 비밀번호는 해싱된다")
    void signup_storesLowercaseEmailAndHashedPassword() {
        SignupRequest request = new SignupRequest("A@X.com", "password123!", "홍길동", "010-1234-5678", Role.SHIPPER);

        MemberResponse response = authService.signup(request);

        assertThat(response.email()).isEqualTo("a@x.com");
        Member member = memberService.getById(response.id());
        assertThat(member.getEmail()).isEqualTo("a@x.com");
        assertThat(member.getPassword()).isNotEqualTo("password123!");
        assertThat(passwordEncoder.matches("password123!", member.getPassword()))
                .isTrue();
    }

    @Test
    @DisplayName("대소문자가 다른 동일한 이메일로 가입 시도 시 DUPLICATE_EMAIL 예외가 발생한다")
    void signup_duplicateEmailIgnoringCase_fails() {
        authService.signup(new SignupRequest("a@x.com", "password123!", "홍길동", "010-1234-5678", Role.SHIPPER));

        SignupRequest duplicateRequest =
                new SignupRequest("A@X.com", "password456!", "김철수", "010-9876-5432", Role.DRIVER);

        assertThatThrownBy(() -> authService.signup(duplicateRequest))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_EMAIL);
    }

    @Test
    @DisplayName("일반 회원가입으로 ADMIN 권한을 요청하면 INVALID_INPUT 예외가 발생한다")
    void signup_asAdmin_fails() {
        SignupRequest adminRequest =
                new SignupRequest("admin@x.com", "password123!", "관리자", "010-0000-0000", Role.ADMIN);

        assertThatThrownBy(() -> authService.signup(adminRequest))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("잘못된 비밀번호로 로그인 시 INVALID_CREDENTIALS 예외가 발생한다")
    void login_wrongPassword_fails() {
        authService.signup(
                new SignupRequest("driver@x.com", "correctPassword123!", "이차주", "010-1111-2222", Role.DRIVER));

        LoginRequest wrongLogin = new LoginRequest("driver@x.com", "wrongPassword!");

        assertThatThrownBy(() -> authService.login(wrongLogin))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    @Test
    @DisplayName("올바른 정보로 로그인 시 JWT 액세스 토큰을 반환한다")
    void login_success_returnsToken() {
        authService.signup(new SignupRequest("user@x.com", "password123!", "유저", "010-3333-4444", Role.SHIPPER));

        LoginRequest loginRequest = new LoginRequest("user@x.com", "password123!");
        TokenResponse tokenResponse = authService.login(loginRequest);

        assertThat(tokenResponse.accessToken()).isNotBlank();
        assertThat(tokenResponse.role()).isEqualTo(Role.SHIPPER);
    }

    @Test
    @DisplayName("존재하지 않는 회원 ID로 조회 시 NOT_FOUND 예외가 발생한다")
    void getById_notFound_fails() {
        assertThatThrownBy(() -> memberService.getById(999999L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOT_FOUND);
    }

    @Test
    @DisplayName("회원 프로필(이름, 연락처) 수정이 정상적으로 반영된다")
    void updateProfile_success_updatesNameAndPhone() {
        MemberResponse registered = authService.signup(
                new SignupRequest("profile@x.com", "password123!", "이전이름", "010-1111-2222", Role.SHIPPER));

        UpdateProfileRequest updateRequest = new UpdateProfileRequest("새이름", "010-9999-8888", null, null);

        MemberResponse updated = memberService.updateProfile(registered.id(), updateRequest);

        assertThat(updated.name()).isEqualTo("새이름");
        assertThat(updated.phone()).isEqualTo("010-9999-8888");

        Member member = memberService.getById(registered.id());
        assertThat(member.getName()).isEqualTo("새이름");
        assertThat(member.getPhone()).isEqualTo("010-9999-8888");
    }

    @Test
    @DisplayName("현재 비밀번호가 일치하면 새 비밀번호로 정상 변경된다")
    void updateProfile_withPasswordChange_success() {
        MemberResponse registered = authService.signup(
                new SignupRequest("pwdtest@x.com", "oldPassword123!", "김화주", "010-1234-5678", Role.SHIPPER));

        UpdateProfileRequest updateRequest =
                new UpdateProfileRequest("김화주", "010-1234-5678", "oldPassword123!", "newPassword999!");

        memberService.updateProfile(registered.id(), updateRequest);

        Member member = memberService.getById(registered.id());
        assertThat(passwordEncoder.matches("newPassword999!", member.getPassword()))
                .isTrue();
        assertThat(passwordEncoder.matches("oldPassword123!", member.getPassword()))
                .isFalse();
    }

    @Test
    @DisplayName("현재 비밀번호가 올바르지 않으면 INVALID_CURRENT_PASSWORD 예외가 발생한다")
    void updateProfile_withWrongCurrentPassword_fails() {
        MemberResponse registered = authService.signup(
                new SignupRequest("wrongpwd@x.com", "password123!", "박차주", "010-5555-6666", Role.DRIVER));

        UpdateProfileRequest updateRequest =
                new UpdateProfileRequest("박차주", "010-5555-6666", "wrongCurrentPwd!", "newPassword999!");

        assertThatThrownBy(() -> memberService.updateProfile(registered.id(), updateRequest))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CURRENT_PASSWORD);
    }

    @Test
    @DisplayName("새 비밀번호가 8자 미만이면 INVALID_INPUT 예외가 발생한다")
    void updateProfile_withShortNewPassword_fails() {
        MemberResponse registered = authService.signup(
                new SignupRequest("shortpwd@x.com", "password123!", "최화주", "010-7777-8888", Role.SHIPPER));

        UpdateProfileRequest updateRequest = new UpdateProfileRequest("최화주", "010-7777-8888", "password123!", "short");

        assertThatThrownBy(() -> memberService.updateProfile(registered.id(), updateRequest))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }
}
