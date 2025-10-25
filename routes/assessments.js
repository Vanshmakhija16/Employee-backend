import express from "express";
import User from "../models/User.js";
import Report from "../models/Report.js";

const router = express.Router();

const assessments = [
  {
    id: 1,
    title: "Beck Depression Inventory (BDI)",
    slug: "bdi",
    description: "A self-assessment to measure levels of depression.",
    category: "mental",
    questions: [
      {
        id: "q1",
        text: "Sadness",
        options: [
          "I do not feel sad.",
          "I feel sad.",
          "I am sad all the time and I can't snap out of it.",
          "I am so sad and unhappy that I can't stand it."
        ],
        optionsWithWeights: {
          "I do not feel sad.": 0,
          "I feel sad.": 1,
          "I am sad all the time and I can't snap out of it.": 2,
          "I am so sad and unhappy that I can't stand it.": 3
        }
      },
      {
        id: "q2",
        text: "Pessimism / Discouragement about the future",
        options: [
          "I am not particularly discouraged about the future.",
          "I feel discouraged about the future.",
          "I feel I have nothing to look forward to.",
          "I feel the future is hopeless and that things cannot improve."
        ],
        optionsWithWeights: {
          "I am not particularly discouraged about the future.": 0,
          "I feel discouraged about the future.": 1,
          "I feel I have nothing to look forward to.": 2,
          "I feel the future is hopeless and that things cannot improve.": 3
        }
      },
      {
        id: "q3",
        text: "Sense of Failure",
        options: [
          "I do not feel like a failure.",
          "I feel I have failed more than the average person.",
          "As I look back on my life, all I can see is a lot of failures.",
          "I feel I am a complete failure as a person."
        ],
        optionsWithWeights: {
          "I do not feel like a failure.": 0,
          "I feel I have failed more than the average person.": 1,
          "As I look back on my life, all I can see is a lot of failures.": 2,
          "I feel I am a complete failure as a person.": 3
        }
      },
      {
        id: "q4",
        text: "Loss of Pleasure",
        options: [
          "I get as much satisfaction out of things as I used to.",
          "I don't enjoy things the way I used to.",
          "I don't get real satisfaction out of anything anymore.",
          "I am dissatisfied or bored with everything."
        ],
        optionsWithWeights: {
          "I get as much satisfaction out of things as I used to.": 0,
          "I don't enjoy things the way I used to.": 1,
          "I don't get real satisfaction out of anything anymore.": 2,
          "I am dissatisfied or bored with everything.": 3
        }
      },
      {
        id: "q5",
        text: "Guilty Feelings",
        options: [
          "I don't feel particularly guilty.",
          "I feel guilty a good part of the time.",
          "I feel quite guilty most of the time.",
          "I feel guilty all of the time."
        ],
        optionsWithWeights: {
          "I don't feel particularly guilty.": 0,
          "I feel guilty a good part of the time.": 1,
          "I feel quite guilty most of the time.": 2,
          "I feel guilty all of the time.": 3
        }
      },
      {
        id: "q6",
        text: "Punishment Feelings",
        options: [
          "I don't feel I am being punished.",
          "I feel I may be punished.",
          "I expect to be punished.",
          "I feel I am being punished."
        ],
        optionsWithWeights: {
          "I don't feel I am being punished.": 0,
          "I feel I may be punished.": 1,
          "I expect to be punished.": 2,
          "I feel I am being punished.": 3
        }
      },
      {
        id: "q7",
        text: "Self-dislike / Disappointment",
        options: [
          "I don't feel disappointed in myself.",
          "I am disappointed in myself.",
          "I am disgusted with myself.",
          "I hate myself."
        ],
        optionsWithWeights: {
          "I don't feel disappointed in myself.": 0,
          "I am disappointed in myself.": 1,
          "I am disgusted with myself.": 2,
          "I hate myself.": 3
        }
      },
      {
        id: "q8",
        text: "Self-criticalness / Blaming",
        options: [
          "I don't feel I am any worse than anybody else.",
          "I am critical of myself for my weaknesses or mistakes.",
          "I blame myself all the time for my faults.",
          "I blame myself for everything bad that happens."
        ],
        optionsWithWeights: {
          "I don't feel I am any worse than anybody else.": 0,
          "I am critical of myself for my weaknesses or mistakes.": 1,
          "I blame myself all the time for my faults.": 2,
          "I blame myself for everything bad that happens.": 3
        }
      },
      {
        id: "q9",
        text: "Suicidal Thoughts or Wishes",
        options: [
          "I don't have any thoughts of killing myself.",
          "I have thoughts of killing myself, but I would not carry them out.",
          "I would like to kill myself.",
          "I would kill myself if I had the chance."
        ],
        optionsWithWeights: {
          "I don't have any thoughts of killing myself.": 0,
          "I have thoughts of killing myself, but I would not carry them out.": 1,
          "I would like to kill myself.": 2,
          "I would kill myself if I had the chance.": 3
        }
      },
      {
        id: "q10",
        text: "Crying",
        options: [
          "I don't cry any more than usual.",
          "I cry more now than I used to.",
          "I cry all the time now.",
          "I used to be able to cry, but now I can't cry even though I want to."
        ],
        optionsWithWeights: {
          "I don't cry any more than usual.": 0,
          "I cry more now than I used to.": 1,
          "I cry all the time now.": 2,
          "I used to be able to cry, but now I can't cry even though I want to.": 3
        }
      },
      {
        id: "q11",
        text: "Agitation / Irritability",
        options: [
          "I am no more irritated by things than I ever was.",
          "I am slightly more irritated now than usual.",
          "I am quite annoyed or irritated a good deal of the time.",
          "I feel irritated all the time."
        ],
        optionsWithWeights: {
          "I am no more irritated by things than I ever was.": 0,
          "I am slightly more irritated now than usual.": 1,
          "I am quite annoyed or irritated a good deal of the time.": 2,
          "I feel irritated all the time.": 3
        }
      },
      {
        id: "q12",
        text: "Loss of Interest",
        options: [
          "I have not lost interest in other people.",
          "I am less interested in other people than I used to be.",
          "I have lost most of my interest in other people.",
          "I have lost all of my interest in other people."
        ],
        optionsWithWeights: {
          "I have not lost interest in other people.": 0,
          "I am less interested in other people than I used to be.": 1,
          "I have lost most of my interest in other people.": 2,
          "I have lost all of my interest in other people.": 3
        }
      },
      {
        id: "q13",
        text: "Indecisiveness",
        options: [
          "I make decisions about as well as I ever could.",
          "I put off making decisions more than I used to.",
          "I have greater difficulty in making decisions more than I used to.",
          "I can't make decisions at all anymore."
        ],
        optionsWithWeights: {
          "I make decisions about as well as I ever could.": 0,
          "I put off making decisions more than I used to.": 1,
          "I have greater difficulty in making decisions more than I used to.": 2,
          "I can't make decisions at all anymore.": 3
        }
      },
      {
        id: "q14",
        text: "Worthlessness about appearance",
        options: [
          "I don't feel that I look any worse than I used to.",
          "I am worried that I am looking old or unattractive.",
          "I feel there are permanent changes in my appearance that make me look unattractive.",
          "I believe that I look ugly."
        ],
        optionsWithWeights: {
          "I don't feel that I look any worse than I used to.": 0,
          "I am worried that I am looking old or unattractive.": 1,
          "I feel there are permanent changes in my appearance that make me look unattractive.": 2,
          "I believe that I look ugly.": 3
        }
      },
      {
        id: "q15",
        text: "Work Difficulty",
        options: [
          "I can work about as well as before.",
          "It takes an extra effort to get started at doing something.",
          "I have to push myself very hard to do anything.",
          "I can't do any work at all."
        ],
        optionsWithWeights: {
          "I can work about as well as before.": 0,
          "It takes an extra effort to get started at doing something.": 1,
          "I have to push myself very hard to do anything.": 2,
          "I can't do any work at all.": 3
        }
      },
      {
        id: "q16",
        text: "Sleep Disturbance",
        options: [
          "I can sleep as well as usual.",
          "I don't sleep as well as I used to.",
          "I wake up 1–2 hours earlier than usual and find it hard to get back to sleep.",
          "I wake up several hours earlier than I used to and cannot get back to sleep."
        ],
        optionsWithWeights: {
          "I can sleep as well as usual.": 0,
          "I don't sleep as well as I used to.": 1,
          "I wake up 1–2 hours earlier than usual and find it hard to get back to sleep.": 2,
          "I wake up several hours earlier than I used to and cannot get back to sleep.": 3
        }
      },
      {
        id: "q17",
        text: "Fatigue",
        options: [
          "I don't get more tired than usual.",
          "I get tired more easily than I used to.",
          "I get tired from doing almost anything.",
          "I am too tired to do anything."
        ],
        optionsWithWeights: {
          "I don't get more tired than usual.": 0,
          "I get tired more easily than I used to.": 1,
          "I get tired from doing almost anything.": 2,
          "I am too tired to do anything.": 3
        }
      },
      {
        id: "q18",
        text: "Appetite",
        options: [
          "My appetite is no worse than usual.",
          "My appetite is not as good as it used to be.",
          "My appetite is much worse now.",
          "I have no appetite at all anymore."
        ],
        optionsWithWeights: {
          "My appetite is no worse than usual.": 0,
          "My appetite is not as good as it used to be.": 1,
          "My appetite is much worse now.": 2,
          "I have no appetite at all anymore.": 3
        }
      },
      {
        id: "q19",
        text: "Weight Loss",
        options: [
          "I haven't lost much weight, if any, lately.",
          "I have lost more than five pounds.",
          "I have lost more than ten pounds.",
          "I have lost more than fifteen pounds."
        ],
        optionsWithWeights: {
          "I haven't lost much weight, if any, lately.": 0,
          "I have lost more than five pounds.": 1,
          "I have lost more than ten pounds.": 2,
          "I have lost more than fifteen pounds.": 3
        }
      },
      {
        id: "q20",
        text: "Health Worries",
        options: [
          "I am no more worried about my health than usual.",
          "I am worried about physical problems like aches, pains, upset stomach, or constipation.",
          "I am very worried about physical problems and it's hard to think of much else.",
          "I am so worried about my physical problems that I cannot think of anything else."
        ],
        optionsWithWeights: {
          "I am no more worried about my health than usual.": 0,
          "I am worried about physical problems like aches, pains, upset stomach, or constipation.": 1,
          "I am very worried about physical problems and it's hard to think of much else.": 2,
          "I am so worried about my physical problems that I cannot think of anything else.": 3
        }
      },
      {
        id: "q21",
        text: "Loss of Interest in Sex",
        options: [
          "I have not noticed any recent change in my interest in sex.",
          "I am less interested in sex than I used to be.",
          "I have almost no interest in sex.",
          "I have lost interest in sex completely."
        ],
        optionsWithWeights: {
          "I have not noticed any recent change in my interest in sex.": 0,
          "I am less interested in sex than I used to be.": 1,
          "I have almost no interest in sex.": 2,
          "I have lost interest in sex completely.": 3
        }
      }
    ],
    scoring: (score) => {
      // Interpretation as per BDI scoring table from the PDF
      if (score <= 10) return { status: "Normal", message: "These ups and downs are considered normal." };
      if (score <= 16) return { status: "Mild Mood Disturbance", message: "Mild mood disturbance." };
      if (score <= 20) return { status: "Borderline Clinical Depression", message: "Borderline clinical depression." };
      if (score <= 30) return { status: "Moderate Depression", message: "Moderate depression." };
      if (score <= 40) return { status: "Severe Depression", message: "Severe depression." };
      return { status: "Extreme Depression", message: "Extreme depression — please seek professional help." };
    },
    maxScore: 63
  
  
  },
  {
    id: 2,
    title: "GAD-7 Anxiety Assessment",
    slug: "gad7",
    description: "A 7-question screening tool to measure anxiety levels.",
    category: "mental",
    questions: [
      {
        id: "q1",
        text: "Feeling nervous, anxious, or on edge",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q2",
        text: "Not being able to stop or control worrying",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q3",
        text: "Worrying too much about different things",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q4",
        text: "Trouble relaxing",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q5",
        text: "Being so restless that it is hard to sit still",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q6",
        text: "Becoming easily annoyed or irritable",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      },
      {
        id: "q7",
        text: "Feeling afraid as if something awful might happen",
        options: [
          "Not at all",
          "Several days",
          "More than half the days",
          "Nearly every day"
        ],
        optionsWithWeights: {
          "Not at all": 0,
          "Several days": 1,
          "More than half the days": 2,
          "Nearly every day": 3
        }
      }
    ],
    scoring: (score) => {
      // Interpretation as per GAD-7 scoring from the PDF
      if (score <= 4) return { status: "Minimal Anxiety", message: "Minimal anxiety." };
      if (score <= 9) return { status: "Mild Anxiety", message: "Mild anxiety." };
      if (score <= 14) return { status: "Moderate Anxiety", message: "Moderate anxiety." };
      return { status: "Severe Anxiety", message: "Severe anxiety — consider professional consultation." };
    },
    maxScore: 21
  },
  {
  id: 3, // Make sure this ID is unique
  title: "Perceived Stress Scale (PSS)",
  slug: "pss",
  description: "A 10-item questionnaire to measure perceived stress levels over the past month.",
  category: "stress",
  questions: [
    {
      id: "q1",
      text: "In the last month, how often have you been upset because of something that happened unexpectedly?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 0, "Almost never": 1, "Sometimes": 2, "Fairly often": 3, "Very often": 4 }
    },
    {
      id: "q2",
      text: "In the last month, how often have you felt that you were unable to control the important things in your life?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 0, "Almost never": 1, "Sometimes": 2, "Fairly often": 3, "Very often": 4 }
    },
    {
      id: "q3",
      text: "In the last month, how often have you felt nervous and stressed?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 0, "Almost never": 1, "Sometimes": 2, "Fairly often": 3, "Very often": 4 }
    },
    {
      id: "q4",
      text: "In the last month, how often have you felt confident about your ability to handle your personal problems?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 4, "Almost never": 3, "Sometimes": 2, "Fairly often": 1, "Very often": 0 } // reverse scored
    },
    {
      id: "q5",
      text: "In the last month, how often have you felt that things were going your way?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 4, "Almost never": 3, "Sometimes": 2, "Fairly often": 1, "Very often": 0 } // reverse scored
    },
    {
      id: "q6",
      text: "In the last month, how often have you found that you could not cope with all the things that you had to do?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 0, "Almost never": 1, "Sometimes": 2, "Fairly often": 3, "Very often": 4 }
    },
    {
      id: "q7",
      text: "In the last month, how often have you been able to control irritations in your life?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 4, "Almost never": 3, "Sometimes": 2, "Fairly often": 1, "Very often": 0 } // reverse scored
    },
    {
      id: "q8",
      text: "In the last month, how often have you felt that you were on top of things?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 4, "Almost never": 3, "Sometimes": 2, "Fairly often": 1, "Very often": 0 } // reverse scored
    },
    {
      id: "q9",
      text: "In the last month, how often have you been angered because of things that happened that were outside of your control?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 0, "Almost never": 1, "Sometimes": 2, "Fairly often": 3, "Very often": 4 }
    },
    {
      id: "q10",
      text: "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?",
      options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
      optionsWithWeights: { "Never": 0, "Almost never": 1, "Sometimes": 2, "Fairly often": 3, "Very often": 4 }
    }
  ],
  maxScore: 40,
  scoring: (score) => {
    if (score <= 13) return { status: "Low Stress", message: "Your stress level is low." };
    if (score <= 26) return { status: "Moderate Stress", message: "You have moderate stress." };
    return { status: "High Stress", message: "You have high perceived stress." };
  }
},
{
  
  id: 4, // Make sure this ID is unique
  title: "WHO-5 Well-being Index",
  slug: "who5",
  description: "A short 5-item self-reported measure of current mental well-being over the last two weeks.",
  category: "mental",
  questions: [
    {
      id: "q1",
      text: "I have felt cheerful and in good spirits.",
      options: ["At no time", "Some of the time", "Less than half the time", "More than half the time", "Most of the time", "All of the time"],
      optionsWithWeights: { "At no time": 0, "Some of the time": 1, "Less than half the time": 2, "More than half the time": 3, "Most of the time": 4, "All of the time": 5 }
    },
    {
      id: "q2",
      text: "I have felt calm and relaxed.",
      options: ["At no time", "Some of the time", "Less than half the time", "More than half the time", "Most of the time", "All of the time"],
      optionsWithWeights: { "At no time": 0, "Some of the time": 1, "Less than half the time": 2, "More than half the time": 3, "Most of the time": 4, "All of the time": 5 }
    },
    {
      id: "q3",
      text: "I have felt active and vigorous.",
      options: ["At no time", "Some of the time", "Less than half the time", "More than half the time", "Most of the time", "All of the time"],
      optionsWithWeights: { "At no time": 0, "Some of the time": 1, "Less than half the time": 2, "More than half the time": 3, "Most of the time": 4, "All of the time": 5 }
    },
    {
      id: "q4",
      text: "I woke up feeling fresh and rested.",
      options: ["At no time", "Some of the time", "Less than half the time", "More than half the time", "Most of the time", "All of the time"],
      optionsWithWeights: { "At no time": 0, "Some of the time": 1, "Less than half the time": 2, "More than half the time": 3, "Most of the time": 4, "All of the time": 5 }
    },
    {
      id: "q5",
      text: "My daily life has been filled with things that interest me.",
      options: ["At no time", "Some of the time", "Less than half the time", "More than half the time", "Most of the time", "All of the time"],
      optionsWithWeights: { "At no time": 0, "Some of the time": 1, "Less than half the time": 2, "More than half the time": 3, "Most of the time": 4, "All of the time": 5 }
    }
  ],
  maxScore: 25,
  scoring: (score) => {
    const percentage = score * 4; // Convert raw score to 0-100
    let interpretation = "";
    if (percentage <= 40) interpretation = "Low well-being";
    else if (percentage <= 60) interpretation = "Moderate well-being";
    else interpretation = "High well-being";

    return { rawScore: score, percentage, interpretation };
  }

},
  {
    id: 5, // make sure the ID is unique
    title: "Sleep Quality Scale (SQS)",
    slug: "sqs",
    description: "A 28-item scale measuring six domains of sleep quality: daytime symptoms, restoration after sleep, problems initiating and maintaining sleep, difficulty waking, and sleep satisfaction.",
    category: "sleep",
    questions: [
      {
        id: "q1",
        text: "I feel refreshed when I wake up in the morning.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true // reverse scored
      },
      {
        id: "q2",
        text: "I experience difficulty falling asleep at night.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q3",
        text: "I wake up frequently during the night.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q4",
        text: "I feel sleepy during the day.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q5",
        text: "I have difficulty waking up in the morning.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q6",
        text: "I feel my sleep is satisfying.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true
      },
      {
        id: "q7",
        text: "I take longer than 30 minutes to fall asleep.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q8",
        text: "I wake up too early and cannot go back to sleep.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q9",
        text: "I feel sleepy while working or studying.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q10",
        text: "I feel my sleep is adequate for daytime functioning.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true
      },
      {
        id: "q11",
        text: "I have trouble staying asleep after initially falling asleep.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q12",
        text: "I experience daytime fatigue.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q13",
        text: "I feel my sleep quality is poor.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q14",
        text: "I have difficulty staying awake during activities.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q15",
        text: "I feel my sleep restores me mentally.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true
      },
      {
        id: "q16",
        text: "I need caffeine to stay alert during the day.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q17",
        text: "I feel my sleep duration is adequate.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true
      },
      {
        id: "q18",
        text: "I feel refreshed after naps.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true
      },
      {
        id: "q19",
        text: "I experience restless sleep.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q20",
        text: "I feel drowsy immediately after waking up.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q21",
        text: "I feel satisfied with my sleep pattern.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true
      },
      {
        id: "q22",
        text: "I take naps during the day to compensate for poor sleep.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q23",
        text: "I have nightmares or disturbing dreams.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q24",
        text: "I feel my sleep meets my needs.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true
      },
      {
        id: "q25",
        text: "I wake up feeling unrefreshed.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q26",
        text: "I feel sleepy before bedtime.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 }
      },
      {
        id: "q27",
        text: "I feel my sleep helps me concentrate during the day.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true
      },
      {
        id: "q28",
        text: "I feel satisfied with my overall sleep quality.",
        options: ["Few", "Sometimes", "Often", "Almost always"],
        optionsWithWeights: { "Few": 0, "Sometimes": 1, "Often": 2, "Almost always": 3 },
        reverse: true
      }
    ],
    maxScore: 84,
    scoring: (score) => {
      if (score <= 20) return { status: "Good Sleep Quality", message: "Your sleep quality is good." };
      if (score <= 50) return { status: "Moderate Sleep Problems", message: "You have moderate sleep issues." };
      return { status: "Poor Sleep Quality", message: "Your sleep quality is poor — consider consulting a professional." };
    }
  }


];

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id || decoded._id;
    req.userRole = (decoded.role || "").toLowerCase();
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }
};

// Routes
router.get("/", (req, res) => {
  res.json(
    assessments.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      description: a.description,
      category: a.category,
      itemCount: a.questions.length
    }))
  );
});
// Get assigned assessments of a student
router.get("/my", authMiddleware, async (req, res) => {
  console.log("Hit")
  try {
    const student = await User.findById(req.userId); // <-- use logged-in user
    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found or not a student" });
    }

    const detailed = (student.assessments || []).map((a) => {
      const meta = assessments.find((m) => m.id === a.assessmentId);
      return {
        assessmentId: a.assessmentId,
        status: a.status,
        assignedAt: a.assignedAt,
        title: meta?.title,
        slug: meta?.slug,
        description: meta?.description
      };
    });

    res.json(detailed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/:slug", (req, res) => {
  const assessment = assessments.find((a) => a.slug === req.params.slug);
  if (!assessment) return res.status(404).json({ error: "Assessment not found" });
  res.json(assessment);
});

// router.get("/:slug", async (req, res) => {
//   try {
//     const assessment = assessments.find((a) => a.slug === req.params.slug);
//     if (!assessment)
//       return res.status(404).json({ error: "Assessment not found" });

//     // Find the logged-in student
//     const student = await User.findById(req.userId);
//     if (!student || student.role !== "student") {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     // Check if this assessment is assigned to the student
//     const assigned = student.assessments?.find(
//       (a) => a.assessmentId === assessment.id
//     );

//     if (!assigned) {
//       return res.status(403).json({ error: "Assessment not assigned to you" });
//     }

//     // Check if it is locked
//     if (assigned.status === "locked") {
//       return res.status(403).json({ error: "Assessment is locked. Contact your doctor." });
//     }

//     // ✅ Assessment is unlocked, send it
//     res.json(assessment);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// ------------------------------
// UNIVERSAL ASSESSMENT SUBMIT
// ------------------------------
router.post("/:slug/submit", async (req, res) => {
  try {
    const assessment = assessments.find((a) => a.slug === req.params.slug);
    if (!assessment)
      return res.status(404).json({ error: "Assessment not found" });

    const { answers } = req.body || {};
    if (!answers)
      return res.status(400).json({ error: "Answers are required" });

    let totalScore = 0;
    const unanswered = [];

    // ⚡ Build quick lookup map for efficiency
    const questionMap = Object.fromEntries(
      assessment.questions.map((q) => [q.id, q])
    );

    // ⚙️ Step 1: Reverse-scoring configuration
    let reverseItems = [];
    let reverseMax = 3; // default max (used for SQS, can be 4 for PSS)

    switch (assessment.slug) {
      case "pss":
        reverseItems = ["q4", "q5", "q7", "q8"];
        reverseMax = 4;
        break;
      case "sleep":
        reverseItems = [
          "q6",
          "q7",
          "q8",
          "q9",
          "q24",
          "q25",
          "q26",
          "q27",
          "q28",
        ];
        reverseMax = 3;
        break;
      default:
        reverseItems = [];
    }

    const reverse = (value, max = reverseMax) => max - value;

    // 🧮 Step 2: Compute total score
    for (const q of assessment.questions) {
      const givenAnswer = answers?.[q.id];
      if (givenAnswer == null) {
        unanswered.push(q.id);
        continue;
      }
      let weight = q.optionsWithWeights?.[givenAnswer] ?? 0;
      if (reverseItems.includes(q.id)) {
        weight = reverse(weight);
      }
      totalScore += weight;
    }

    // 🧠 Step 3: Domain grouping per assessment
    let domainMap = {};

    switch (assessment.slug) {
      // ✅ Beck Depression Inventory (BDI)
      case "bdi":
        domainMap = {
          cognitive: [
            "q1",
            "q2",
            "q3",
            "q5",
            "q6",
            "q7",
            "q8",
            "q9",
            "q13",
            "q14",
          ],
          behavioral: ["q4", "q10", "q11", "q12", "q15"],
          somatic: ["q16", "q17", "q18", "q19", "q20", "q21"],
        };
        break;

      // ✅ GAD-7
      case "gad7":
        domainMap = {
          cognitive: ["q2", "q3", "q7"],
          physical: ["q4", "q5"],
          emotional: ["q1", "q6"],
        };
        break;

      // ✅ Perceived Stress Scale (PSS)
      case "pss":
        domainMap = {
          helplessness: ["q1", "q2", "q3", "q6", "q9", "q10"],
          self_efficacy: ["q4", "q5", "q7", "q8"],
        };
        break;

      // ✅ WHO-5 (conceptual domains for visualization)
      case "who5":
        domainMap = {
          positive_mood: ["q1"],
          relaxation_calmness: ["q2"],
          energy_vitality: ["q3"],
          restorative_sleep: ["q4"],
          engagement_interest: ["q5"],
        };
        break;

      // ✅ Sleep Quality Scale (SQS)
      case "sleep":
        domainMap = {
          daytime_symptoms: ["q1", "q2", "q3", "q4", "q5"],
          restoration_after_sleep: ["q6", "q7", "q8", "q9"],
          problems_initiating_sleep: ["q10", "q11", "q12", "q13", "q14"],
          problems_maintaining_sleep: ["q15", "q16", "q17", "q18", "q19"],
          difficulty_waking: ["q20", "q21", "q22", "q23"],
          sleep_satisfaction: ["q24", "q25", "q26", "q27", "q28"],
        };
        break;

      default:
        domainMap = {};
    }

    // 📊 Step 4: Compute domain scores
    const domainScores = {};
    for (const [domain, ids] of Object.entries(domainMap)) {
      domainScores[domain] = ids.reduce((sum, id) => {
        const givenAnswer = answers?.[id];
        const q = questionMap[id];
        if (!q) return sum;
        let weight = q.optionsWithWeights?.[givenAnswer] ?? 0;
        if (reverseItems.includes(id)) weight = reverse(weight);
        return sum + weight;
      }, 0);
    }

    // ⚖️ Step 5: Scoring and percentage
    const scoringFn =
      assessment.scoring ||
      (() => ({
        status: "Unknown",
        message: "Scoring function not defined.",
      }));

    const { status, message } = scoringFn(totalScore);
    const percentage = assessment.maxScore
      ? Math.round((totalScore / assessment.maxScore) * 100)
      : 0;

    // 💾 Step 6: Save report to MongoDB
    const newReport = new Report({
      assessmentSlug: assessment.slug,
      assessmentTitle: assessment.title,
      score: totalScore,
      maxScore: assessment.maxScore,
      percentage,
      status,
      message,
      domainScores,
    });

    await newReport.save();
    console.log(`✅ ${assessment.title} report saved successfully.`);

    // 🚀 Step 7: Respond to frontend
    res.json({
      score: totalScore,
      maxScore: assessment.maxScore,
      percentage,
      report: `${totalScore} / ${assessment.maxScore}`,
      status,
      message,
      unanswered,
      domainScores, // for frontend charts (bar/pie/radar)
    });
  } catch (err) {
    console.error("❌ Error submitting assessment:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});

// Assign assessment to a student (always unlocked)
router.post("/assign/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { assessmentSlug } = req.body;

    // Find the student
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    // Find the assessment
    const assessment = assessments.find((a) => a.slug === assessmentSlug);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // Check if already assigned by assessmentId
    const already = student.assessments?.find((a) => a.assessmentId === assessment.id);
    if (already) {
      return res.status(400).json({ error: "Assessment already assigned" });
    }

    // ✅ Assign as unlocked by default (forever)
    if (!student.assessments) student.assessments = [];
    student.assessments.push({ assessmentId: assessment.id, status: "locked" });
    await student.save();

    res.json({ message: "Assessment assigned successfully", assessments: student.assessments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put("/unlock/:studentId/:assessmentId", async (req, res) => {
  try {
    const { studentId, assessmentId } = req.params;

    // 🧠 Optional but strongly recommended: only doctors can unlock
    if (req.user.role !== "doctor") {
      return res.status(403).json({ error: "Access denied: only doctors can unlock assessments" });
    }

    // Find the student
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    // Find assessment in student's array
    const assessment = student.assessments.find(
      (a) => a.assessmentId === parseInt(assessmentId)
    );

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not assigned to this student" });
    }

    // Check if it's already unlocked
    if (assessment.status === "unlocked") {
      return res.json({
        message: "Assessment is already unlocked",
        assessments: student.assessments,
      });
    }

    // Unlock it
    assessment.status = "unlocked";
    await student.save();

    res.json({
      message: "Assessment unlocked successfully",
      assessments: student.assessments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


router.put("/unlock-by-assessment/:assessmentId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ error: "Access denied: only doctors can unlock assessments" });
    }

    const { assessmentId } = req.params;

    // Update all students who have this assessment assigned
    const result = await User.updateMany(
      { role: "student", "assessments.assessmentId": parseInt(assessmentId) },
      { $set: { "assessments.$.status": "unlocked" } }
    );

    res.json({
      message: `Assessment ${assessmentId} unlocked for ${result.modifiedCount} students`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});







export default router;
