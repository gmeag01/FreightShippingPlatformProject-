package com.freight.member.entity;

import com.freight.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Locale;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 회원(화주, 차주, 관리자). 로그인 계정과 역할, 상태를 담는다. */
@Getter
@Entity
@Table(name = "members")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'ACTIVE'")
    private MemberStatus status = MemberStatus.ACTIVE;

    // 이메일은 소문자로 저장한다. A@x.com과 a@x.com을 같은 계정으로 보기 위해서다(첫 주 계획 Review Focus 4).
    @Builder
    private Member(Long id, String email, String password, String name, String phone, Role role, MemberStatus status) {
        this.id = id;
        this.email = email != null ? email.toLowerCase(Locale.ROOT) : null;
        this.password = password;
        this.name = name;
        this.phone = phone;
        this.role = role;
        this.status = status != null ? status : MemberStatus.ACTIVE;
    }

    /**
     * 회원 프로필(이름, 연락처) 정보를 수정한다.
     */
    public void updateProfile(String name, String phone) {
        if (name != null && !name.isBlank()) {
            this.name = name.trim();
        }
        if (phone != null && !phone.isBlank()) {
            this.phone = phone.trim();
        }
    }

    /**
     * 비밀번호를 암호화된 새 비밀번호로 변경한다.
     */
    public void changePassword(String encodedPassword) {
        if (encodedPassword != null && !encodedPassword.isBlank()) {
            this.password = encodedPassword;
        }
    }

    /**
     * 계정을 정지 상태로 전이한다.
     */
    public void suspend() {
        this.status = MemberStatus.SUSPENDED;
    }

    /**
     * 계정을 정상 활성 상태로 전이한다.
     */
    public void activate() {
        this.status = MemberStatus.ACTIVE;
    }
}
