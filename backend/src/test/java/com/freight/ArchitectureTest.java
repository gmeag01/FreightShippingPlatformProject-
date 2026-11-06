package com.freight;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaParameter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * AGENTS.md의 '반드시 지킬 것' 중 코드로 검사할 수 있는 규칙을 테스트로 막는다.
 * 아직 코드가 없는 도메인도 있으므로 검사할 클래스가 없어도 통과하게 둔다(allowEmptyShould).
 */
@AnalyzeClasses(packages = "com.freight", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
    static final String[] DOMAINS = {"member", "vehicle", "fare", "order", "matching", "delivery", "payment"};

    /** 다른 도메인의 repository를 직접 쓰지 않는다. 필요하면 그 도메인의 service를 호출한다. */
    @ArchTest
    static void noCrossDomainRepositoryAccess(JavaClasses classes) {
        for (String domain : DOMAINS) {
            noClasses()
                    .that()
                    .resideOutsideOfPackage("..freight." + domain + "..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("..freight." + domain + ".repository..")
                    .allowEmptyShould(true)
                    .check(classes);
        }
    }

    /** 컨트롤러는 엔티티가 아니라 DTO를 반환한다. */
    @ArchTest
    static final ArchRule controllersDoNotReturnEntities = methods()
            .that()
            .areDeclaredInClassesThat()
            .resideInAPackage("..controller..")
            .and()
            .arePublic()
            .should()
            .notHaveRawReturnType(resideInAPackage("..entity.."))
            .allowEmptyShould(true);

    /**
     * 컨트롤러의 @RequestParam, @PathVariable에는 이름을 직접 적는다.
     * VS Code처럼 -parameters 없이 컴파일하면 Spring이 이름을 알 수 없어 요청이 500으로 실패하기 때문이다.
     */
    @ArchTest
    static final ArchRule controllerParametersDeclareExplicitNames = methods()
            .that()
            .areDeclaredInClassesThat()
            .resideInAPackage("..controller..")
            .should(declareExplicitWebParameterNames())
            .allowEmptyShould(true);

    private static ArchCondition<JavaMethod> declareExplicitWebParameterNames() {
        return new ArchCondition<>("declare explicit names on web parameters") {
            @Override
            public void check(JavaMethod method, ConditionEvents events) {
                method.getParameters().stream()
                        .filter(parameter -> !hasExplicitWebParameterName(parameter))
                        .forEach(parameter -> events.add(SimpleConditionEvent.violated(
                                method, parameter.getDescription() + " has no explicit name")));
            }
        };
    }

    private static boolean hasExplicitWebParameterName(JavaParameter parameter) {
        if (parameter.isAnnotatedWith(RequestParam.class)) {
            RequestParam requestParam = parameter.getAnnotationOfType(RequestParam.class);
            return !requestParam.name().isEmpty() || !requestParam.value().isEmpty();
        }
        if (parameter.isAnnotatedWith(PathVariable.class)) {
            PathVariable pathVariable = parameter.getAnnotationOfType(PathVariable.class);
            return !pathVariable.name().isEmpty() || !pathVariable.value().isEmpty();
        }
        return true;
    }
}
