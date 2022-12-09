package de.david.QuizShowCreator.api;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hello")
public class HelloController {

    @GetMapping
    public String getHello(@RequestParam String name){
        return "Hallo " + name;
    }

}
