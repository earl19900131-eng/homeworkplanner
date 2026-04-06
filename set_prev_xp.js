// 브라우저 콘솔에 붙여넣기해서 실행
(async () => {
  const rows = [
    { name: "박태영",       xp: 176  },
    { name: "박시환",       xp: -96  },
    { name: "이성재",       xp: 280  },
    { name: "박서진",       xp: 318  },
    { name: "임일용",       xp: 120  },
    { name: "김가연",       xp: 317  },
    { name: "최석인",       xp: 367  },
    { name: "유아진",       xp: 505  },
    { name: "이창욱",       xp: 370  },
    { name: "김미경",       xp: 298  },
    { name: "장주호",       xp: 354  },
    { name: "장태영",       xp: 305  },
    { name: "장주명",       xp: 326  },
    { name: "김지은",       xp: 523  },
    { name: "민동준",       xp: 421  },
    { name: "이세경",       xp: 481  },
    { name: "이준",         xp: 466  },
    { name: "홍지율",       xp: 352  },
    { name: "이화진",       xp: 354  },
    { name: "박지후",       xp: 463  },
    { name: "김수빈",       xp: 554  },
    { name: "장슬아",       xp: 521  },
    { name: "정해윤",       xp: 421  },
    { name: "신성환",       xp: 497  },
    { name: "이은빈",       xp: 563  },
    { name: "김서율",       xp: 518  },
    { name: "장은서",       xp: 487  },
    { name: "박시현",       xp: 503  },
    { name: "배민성",       xp: 526  },
    { name: "윤정빈",       xp: 589  },
    { name: "김도현",       xp: 649,  classHint: "중3" },
    { name: "김서연",       xp: 674  },
    { name: "이시후",       xp: 325  },
    { name: "오태준",       xp: 510  },
    { name: "김대현",       xp: 551  },
    { name: "황윤희",       xp: 611  },
    { name: "변선재",       xp: 768  },
    { name: "오영우",       xp: 695  },
    { name: "주영제",       xp: 830  },
    { name: "정혜윤",       xp: 796  },
    { name: "장은녕",       xp: 794  },
    { name: "최윤아",       xp: 799  },
    { name: "이명항",       xp: 928  },
    { name: "김도현",       xp: 782,  classHint: "중2" },
    { name: "차준범",       xp: 848  },
    { name: "이태연",       xp: 862  },
    { name: "이주은",       xp: 0    },
    { name: "정효건",       xp: 0    },
    { name: "이지호",       xp: 0    },
    { name: "황도윤",       xp: 0    },
    { name: "박홍욱",       xp: 0    },
    { name: "이홍교",       xp: 0    },
    { name: "천유영",       xp: 0    },
    { name: "이선아",       xp: 0    },
    { name: "전지현",       xp: 0    },
    { name: "기나현",       xp: 0    },
    { name: "정진우",       xp: 21   },
    { name: "이준서",       xp: 21   },
    { name: "이가윤",       xp: 18   },
    { name: "윤하준",       xp: 18   },
    { name: "우진성",       xp: 0    },
    { name: "김하은",       xp: 8    },
    { name: "유지찬",       xp: 71   },
    { name: "이지현",       xp: 0    },
    { name: "강동윤",       xp: 6    },
  ];

  const snap = await firebase.database().ref("students").once("value");
  const students = Object.values(snap.val() || {});

  const updates = {};
  const notFound = [];
  const usedIds = new Set();

  for (const row of rows) {
    let matches = students.filter(s => s.name === row.name && !usedIds.has(s.id));

    if (matches.length === 0) {
      notFound.push(row.name);
      continue;
    }

    let target = matches[0];
    if (matches.length > 1 && row.classHint) {
      const hinted = matches.find(s => s.className && s.className.includes(row.classHint));
      if (hinted) target = hinted;
    }

    usedIds.add(target.id);
    updates[`studentProfiles/${target.id}/prevSeasonXp`] = row.xp;
    console.log(`✅ ${row.name} (${target.className}) → ${row.xp}`);
  }

  if (notFound.length) console.warn("❌ 못 찾은 학생:", notFound.join(", "));

  await firebase.database().ref().update(updates);
  console.log(`\n🎉 완료: ${Object.keys(updates).length}명 업데이트`);
})();
